# Despliegue a producción

Guía para poner el ERP en internet gratis: una VM de Oracle Cloud con todo adentro, un subdominio
de DuckDNS y HTTPS automático. Primero explica las piezas; después, el paso a paso.

## 1. Cómo queda armado

```text
  Navegador / celular
          │  https://mi-erp.duckdns.org
          ▼
┌─────────────────── VM de Oracle (Ubuntu + Docker) ───────────────────┐
│                                                                      │
│   web (Caddy) :80 :443                                               │
│     ├── /api/*  ──────────►  backend (Spring Boot) :8080             │
│     └── todo lo demás: la web (archivos de Expo)       │             │
│                                                        ▼             │
│                                            postgres :5432            │
│                                            (solo red interna)        │
└──────────────────────────────────────────────────────────────────────┘
```

- Hay **un solo dominio**: la web y la API comparten la dirección, la API bajo `/api/`.
- Desde internet solo están abiertos los puertos 80 y 443, los de Caddy. El backend y la base no
  se ven desde afuera.
- La app de Android llama a la misma dirección (`https://mi-erp.duckdns.org/api/...`).

## 2. Qué es cada cosa

**Docker y Docker Compose.** Docker corre cada programa en un *contenedor*: una caja que trae
todo lo que el programa necesita (Java, Postgres, etc.), así funciona igual en tu PC que en la
VM. Compose levanta varios contenedores juntos a partir de un archivo
(`deploy/docker-compose.prod.yml`), con un solo comando, y los conecta en una red privada donde
se llaman por nombre (`postgres`, `backend`).

**Caddy.** Es un servidor web, el único que atiende a internet. Hace tres cosas:
1. **HTTPS automático**: le pide a Let's Encrypt un certificado gratis para el dominio y lo
   renueva solo. Sin HTTPS, Android no deja que la app se conecte y el navegador marca el sitio
   como inseguro.
2. **Sirve la web**: los archivos que genera `expo export`.
3. **Hace de proxy**: lo que llega a `/api/...` se lo pasa al backend.

**Flyway.** Lleva el control de los cambios en la estructura de la base (tablas, columnas,
índices). Cada cambio es un archivo SQL numerado en `backend/src/main/resources/db/migration`
(`V1__esquema_inicial.sql`, `V2__...`). Al arrancar, el backend mira en la tabla
`flyway_schema_history` cuáles ya aplicó y ejecuta solo las nuevas, en orden.
Antes, Hibernate modificaba las tablas solo al arrancar (`ddl-auto: update`). En producción eso
es riesgoso: no borra columnas, no cambia restricciones, no deja registro de qué cambió y puede
fallar a mitad de camino. Ahora Hibernate solo **valida** (`ddl-auto: validate`): si una entidad
no coincide con la base, el backend no arranca y avisa qué falta.

**Perfil `prod` de Spring.** `application.yaml` tiene la configuración común;
`application-prod.yaml` pisa lo que cambia en producción (sin el SQL en los logs, IP real detrás
de Caddy). Se activa con `SPRING_PROFILES_ACTIVE=prod`, que ya pone el compose.

**Variables de entorno y `deploy/.env`.** Los secretos (contraseña de la base, clave de los
tokens) no van en el código: van en `deploy/.env`, un archivo que solo existe en la VM y que git
ignora. Compose los lee de ahí y se los pasa a cada contenedor.

**CORS.** Es una regla de los navegadores: una página de un sitio no puede llamar a la API de
otro sitio, salvo que esa API lo permita. En desarrollo se permite todo (`*`). En producción, solo
`https://${DOMAIN}`, aunque como la web y la API comparten dominio, el navegador ni lo necesita.
Las apps de celular no pasan por CORS.

**DuckDNS.** Da un subdominio gratis (`algo.duckdns.org`) que apunta a la IP de la VM. Hace falta
un nombre, y no solo una IP, para tener certificado HTTPS.

**Oracle Cloud Always Free.** Una VM ARM gratis para siempre (en 2026, 2 CPU y 12 GB de RAM).
Ojo: Oracle puede reclamar VMs "ociosas", con menos del 20% de uso de CPU, red y memoria durante 7
días. Si pasás la cuenta a *Pay As You Go* no te cobra mientras uses solo lo gratis, y esas
cuentas no tienen reclamación por inactividad. Conviene configurar una alerta de presupuesto en
USD 1.

**EAS Build.** El servicio de Expo que compila la app de Android (APK) o iOS en la nube.

## 3. Archivos del repo

| Archivo | Para qué |
|---|---|
| `backend/Dockerfile` | Compila el backend con Maven y arma la imagen con Java 21. Sirve en PC (amd64) y en la VM (arm64). |
| `backend/.dockerignore` | Lo que no se copia a la imagen (`target`, `.env`, `.idea`). |
| `backend/src/main/resources/application.yaml` | Config común: URL de la base por variable (`DB_URL`), Flyway, `ddl-auto: validate`, orígenes CORS. |
| `backend/src/main/resources/application-prod.yaml` | Producción: sin SQL en los logs, IP real detrás del proxy, apagado ordenado. |
| `backend/src/main/resources/db/migration/V1__esquema_inicial.sql` | Las 30 tablas actuales, generadas con las entidades. |
| `deploy/docker-compose.prod.yml` | Los 3 contenedores (postgres, backend, web) y sus variables. |
| `deploy/Caddyfile` | HTTPS, `/api/` al backend y la web (todas las rutas devuelven `index.html`). |
| `deploy/web.Dockerfile` | Exporta la web con Expo y la mete en una imagen de Caddy. |
| `deploy/.env.example` | Plantilla de los secretos; se copia a `deploy/.env`. |
| `deploy/backup.sh` | Backup de la base en `deploy/backups/`, conserva 14 días. |
| `frontend/erp-system/eas.json` | Perfiles para compilar Android: `apk` (para instalar directo) y `production` (tiendas). |
| `frontend/erp-system/app.json` | Web en modo `single` (una página, para que `/promotions/123` no dé 404 al refrescar) e identificador `com.gonzalez.erp` para las apps. |

## 4. Primer despliegue, paso a paso

### 4.1 Crear la cuenta y la VM en Oracle

1. Crear la cuenta en <https://www.oracle.com/cloud/free/>. Pide tarjeta para verificar,
   aunque no cobra. **Región: Brazil East (São Paulo)**, la más cercana. La región no se puede
   cambiar después.
2. (Recomendado) Pasar la cuenta a *Pay As You Go* y crear una alerta de presupuesto en USD 1
   (Billing → Budgets).
3. Compute → Instances → **Create instance**:
   - Image: **Ubuntu 24.04**.
   - Shape: **VM.Standard.A1.Flex** (Ampere, ARM), 2 OCPU y 12 GB. Si dice que no hay
     capacidad, reintentar más tarde o en otro *availability domain*.
   - Networking: dejar que cree la VCN y la subred pública, con **IP pública**.
   - SSH keys: descargar la clave privada que genera (o subir la tuya). Sin ella no se puede
     entrar.
4. (Recomendado) Hacer la IP **reservada** para que no cambie: Networking → IP Management →
   Reserved public IPs, y asignarla a la VM.

### 4.2 Abrir los puertos 80 y 443

En Oracle hay que abrirlos en **dos** lugares. Es el error más común.

1. **En la nube**: Networking → Virtual cloud networks → tu VCN → Security Lists → Default →
   *Add Ingress Rules*: origen `0.0.0.0/0`, TCP, puertos `80,443`. Otra regla igual en UDP para
   `443` (HTTP/3, opcional).
2. **Dentro de la VM** (las imágenes de Oracle traen un firewall que bloquea todo): entrar por
   SSH (`ssh -i clave.key ubuntu@IP`) y correr:
   ```sh
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
   sudo iptables -I INPUT 6 -m state --state NEW -p udp --dport 443 -j ACCEPT
   sudo netfilter-persistent save
   ```

### 4.3 Subdominio en DuckDNS

1. Entrar a <https://www.duckdns.org> (con Google o GitHub).
2. Crear un subdominio (p. ej. `mi-erp`) y en *current ip* poner la IP pública de la VM.
3. Verificar desde tu PC: `nslookup mi-erp.duckdns.org` tiene que devolver esa IP.

### 4.4 Instalar Docker en la VM

```sh
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
exit   # salir y volver a entrar por SSH para que tome el grupo
```

### 4.5 Bajar el proyecto y configurarlo

```sh
git clone https://github.com/FabriGonzalez/erp-system.git
cd erp-system/deploy
cp .env.example .env
nano .env
```

Si el repo es privado, GitHub pide usuario y un *personal access token* (Settings → Developer
settings → Fine-grained tokens, con permiso de lectura del repo) en lugar de la contraseña.

En `.env`:
- `DOMAIN=mi-erp.duckdns.org`
- `POSTGRES_PASSWORD` y `JWT_SECRET`: generarlos con `openssl rand -base64 48` (uno distinto
  para cada uno).
- `ERP_PLATFORM_ADMIN_EMAIL` y `ERP_PLATFORM_ADMIN_PASSWORD`: el usuario que crea las empresas.

### 4.6 Levantar todo

```sh
docker compose -f docker-compose.prod.yml up -d --build
```

La primera vez tarda varios minutos (compila el backend y la web). Para ver cómo va:

```sh
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f backend   # Ctrl+C para salir
```

En el log del backend tiene que aparecer `Successfully applied 1 migration` y
`Platform admin 'platform_admin' created`. Entrar a `https://mi-erp.duckdns.org`, iniciar sesión
con el platform admin y crear las empresas.

Después se puede borrar `ERP_PLATFORM_ADMIN_PASSWORD` del `.env`: solo se usa para crear el usuario
la primera vez.

### 4.7 Backups

Programar el backup diario a las 3 AM (`crontab -e` y agregar la línea):

```cron
0 3 * * * /home/ubuntu/erp-system/deploy/backup.sh >> /home/ubuntu/backup.log 2>&1
```

Los backups quedan en `deploy/backups/` **dentro de la VM**: si la VM se pierde, se pierden con
ella. Copialos a tu PC de vez en cuando:

```sh
scp -i clave.key "ubuntu@IP:erp-system/deploy/backups/*.dump" .
```

(O automatizarlo con `rclone` hacia Google Drive.)

Restaurar un backup (borra lo que haya en la base):

```sh
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U erp -d erp_db --clean --if-exists < backups/erp-AAAA-MM-DD_HHMM.dump
```

## 5. Actualizar a una versión nueva

En la VM:

```sh
cd ~/erp-system && git pull
cd deploy && docker compose -f docker-compose.prod.yml up -d --build
```

Si hay migraciones nuevas, Flyway las aplica solo al arrancar el backend. Conviene correr
`backup.sh` antes de actualizar.

## 6. App de Android

1. En `frontend/erp-system/eas.json`, reemplazar `TU-SUBDOMINIO` por el subdominio real (en los
   dos perfiles).
2. Desde `frontend/erp-system` en tu PC:
   ```sh
   npm install -g eas-cli
   eas login        # cuenta gratis de Expo
   eas init         # vincula el proyecto (agrega el projectId a app.json)
   eas build -p android --profile apk
   ```
3. Al terminar, EAS da un link para descargar el APK. Se lo pasás a los clientes; Android pide
   permitir "instalar apps de origen desconocido".

Para publicar en Play Store (USD 25, un único pago) se usa el perfil `production`.

## 7. iPhone

No hay forma gratis de instalar una app propia en iPhones de otros (Apple pide USD 99 por año).
Mientras tanto, desde un iPhone se usa la web: abrir el sitio en Safari → Compartir → **Agregar a
inicio**. Queda un ícono como el de una app.

## 8. Cambios en la base desde ahora

- **Cada cambio en una entidad** (tabla, columna, índice, restricción nueva) necesita una
  migración nueva: `V2__descripcion.sql`, `V3__...`. Si falta, el backend no arranca:
  `validate` avisa qué tabla o columna no coincide.
- **Nunca editar una migración ya aplicada**: Flyway guarda una suma de control de cada una y no
  arranca si cambió.
- **Agregar un valor a un enum** (p. ej. un estado de pedido nuevo) también necesita migración:
  las columnas de enum tienen una restricción `CHECK` con los valores permitidos (ver
  `orders_status_check` en V1). `validate` no la revisa: el backend arrancaría, pero guardar el
  valor nuevo fallaría. La migración la reemplaza:
  ```sql
  ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  ALTER TABLE orders ADD CONSTRAINT orders_status_check
      CHECK (status IN ('CONFIRMED', 'TO_PREPARE', 'SHIPPED', 'CANCELLED', 'NUEVO'));
  ```
- La base de desarrollo (`erp_db`) ya existía sin Flyway: la primera vez que arranca se marca como
  versión 1 (`baseline-on-migrate`) y desde ahí aplica las migraciones nuevas como producción.

## 9. Problemas comunes

| Síntoma | Qué revisar |
|---|---|
| El sitio no carga o no hay certificado | Puertos 80/443 abiertos en los **dos** lugares (4.2); DuckDNS apunta a la IP correcta; `docker compose ... logs web`. |
| La web carga pero el login falla | `docker compose ... logs backend`; que `DOMAIN` en `.env` sea exactamente el subdominio. |
| El backend no arranca: `Schema-validation` | Falta una migración para un cambio de entidad (sección 8). |
| El backend no arranca: `Validate failed: Migration checksum mismatch` | Se editó una migración ya aplicada: volver el archivo a como estaba y hacer una nueva. |
| La VM se apagó sola | Reclamación por inactividad de Oracle: pasar la cuenta a Pay As You Go (sección 2). |
