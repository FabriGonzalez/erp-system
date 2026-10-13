# ERP System

ERP multi-empresa (multi-tenant) con una API REST en **Spring Boot** y una app móvil/web en **React Native + Expo**. Permite gestionar sucursales, productos con variantes, inventario, clientes con cuenta corriente, pedidos, pagos y envíos.

## Funcionalidades

| Módulo | Qué hace |
| --- | --- |
| **Auth** | Login con JWT y permisos por rol. |
| **Provisioning** | Alta de una empresa nueva con su primer usuario administrador (solo `PLATFORM_ADMIN`). |
| **Users / Roles** | Usuarios, roles con permisos granulares y asignación de usuarios a sucursales. |
| **Branches** | Sucursales de cada empresa. |
| **Categories** | Categorías de productos. |
| **Products** | Productos con variantes y atributos (ej. talle, color), SKU único y stock inicial. |
| **Inventory** | Stock por sucursal, ajustes y movimientos de stock. |
| **Transfers** | Transferencias de stock entre sucursales. |
| **Customers** | Clientes, direcciones, cuenta corriente y listado de deudores. |
| **Orders** | Pedidos (venta con productos o venta rápida) con estados `CONFIRMED → TO_PREPARE → SHIPPED` o `CANCELLED`, edición, cancelación y pago inicial. |
| **Payments** | Pagos en efectivo, transferencia, tarjeta de débito o crédito, aplicados a pedidos. |
| **Shipments** | Envío asociado a un pedido. |

## Estructura del repositorio

```text
erp-system/
├── backend/                 # API REST (Spring Boot, Java 21, Maven)
│   └── src/main/java/com/gonzalez/erp/
│       ├── common/          # DTOs, entidades base y excepciones compartidas
│       ├── config/          # Seguridad, JWT, OpenAPI, manejo global de errores
│       └── modules/         # Un paquete por módulo (controller, service, repository, entity, dto, mapper)
├── frontend/erp-system/     # App Expo / React Native (Expo Router)
│   └── src/
│       ├── app/             # Pantallas y navegación (file-based routing)
│       ├── components/      # Componentes reutilizables
│       ├── services/        # Cliente HTTP hacia la API
│       ├── stores/          # Estado global (Zustand)
│       └── types/           # Tipos y contratos TypeScript
└── docker-compose.yml       # PostgreSQL para desarrollo
```

## Stack

**Backend:** Java 21 · Spring Boot 4.1 · Spring Security + JWT (jjwt) · Spring Data JPA / Hibernate · PostgreSQL · springdoc-openapi (Swagger UI) · Lombok

**Frontend:** Expo SDK 57 · React Native 0.86 · React 19 · Expo Router · TypeScript · Zustand · AsyncStorage

## Requisitos

- Java 21
- Node.js y npm
- Docker (para PostgreSQL)

## Puesta en marcha

### 1. Base de datos

```bash
docker compose up -d
```

Levanta PostgreSQL 17 en `localhost:5432` con la base `erp_db` (usuario y contraseña `postgres`). Hibernate crea y actualiza las tablas automáticamente (`ddl-auto: update`).

### 2. Backend

Spring Boot **no lee archivos `.env`** por sí solo: tenés que definir las variables de entorno en tu shell o en la configuración de ejecución de tu IDE. Usá [backend/.env.example](backend/.env.example) como referencia.

| Variable | Obligatoria | Descripción |
| --- | --- | --- |
| `JWT_SECRET` | Sí | Clave para firmar los tokens JWT. |
| `JWT_EXPIRATION_MS` | No | Duración del token en ms (por defecto `86400000`, 24 h). |
| `DB_USERNAME` / `DB_PASSWORD` | No | Credenciales de la base (por defecto `postgres` / `postgres`). |
| `ERP_PLATFORM_ADMIN_PASSWORD` | Sí, en el primer arranque | Contraseña del usuario `platform_admin`; el arranque falla si ese usuario no existe y la variable está vacía. |
| `ERP_PLATFORM_ADMIN_USERNAME` / `ERP_PLATFORM_ADMIN_EMAIL` | No | Por defecto `platform_admin` / `platform@erp.local`. |

> La URL de la base está fija en `application.yaml` (`jdbc:postgresql://localhost:5432/erp_db`); si usás otra base, editá ese archivo.

Ejemplo en PowerShell:

```powershell
cd backend
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:JWT_SECRET = "una-clave-larga-y-aleatoria-de-al-menos-32-caracteres"
$env:ERP_PLATFORM_ADMIN_PASSWORD = "cambiame"
.\mvnw.cmd spring-boot:run
```

En Linux/macOS:

```bash
cd backend
SPRING_PROFILES_ACTIVE=dev \
JWT_SECRET="una-clave-larga-y-aleatoria-de-al-menos-32-caracteres" \
ERP_PLATFORM_ADMIN_PASSWORD="cambiame" \
./mvnw spring-boot:run
```

La API queda en `http://localhost:8080`.

En el primer arranque se crea el usuario `platform_admin` (administrador de plataforma, sin empresa ni rol de empresa). Con ese usuario se provisionan las empresas desde `POST /api/v1/provisioning/companies`; cada empresa recibe su propio rol `Administrador` (de sistema: no se puede editar ni desactivar) y su primer usuario administrador, que es quien opera el resto del sistema.

### 3. Frontend

```bash
cd frontend/erp-system
npm install
npm start
```

Desde la salida de Expo podés abrir la app en Android, iOS, web (`npm run web`) o Expo Go.

La URL de la API se configura con `EXPO_PUBLIC_API_URL` en [frontend/erp-system/.env](frontend/erp-system/.env) (por defecto `http://localhost:8080`). Si probás desde un celular físico o un emulador Android, `localhost` no apunta a tu máquina: usá la IP de tu red local (o `http://10.0.2.2:8080` en el emulador de Android).

## Documentación de la API

Con el perfil `dev` activo, Swagger UI está disponible sin autenticación en:

- Swagger UI: <http://localhost:8080/swagger-ui.html>
- OpenAPI JSON: <http://localhost:8080/v3/api-docs>

Sin el perfil `dev`, la documentación está deshabilitada. Para probar endpoints protegidos, hacé login en `POST /api/v1/auth/login` y pasá el token con el botón **Authorize** (esquema `bearerAuth`).

Los endpoints cuelgan de `/api/v1/`: `auth`, `branches`, `categories`, `customers`, `inventory` (`stocks`, `movements`, `transfers`), `orders`, `payments`, `product-attributes`, `products`, `provisioning`, `roles` y `users`.

## Seguridad

- API stateless con JWT; solo `/api/v1/auth/login` es público.
- `/api/v1/provisioning/**` requiere ser administrador de plataforma (`users.platform_admin`). Ese acceso no sale de ningún rol de empresa, así que una empresa no puede otorgarlo.
- El resto de los endpoints exige autenticación y los permisos del rol del usuario (por ejemplo `CREAR_PEDIDOS`, `ADMINISTRAR_PRODUCTOS`, `AJUSTAR_STOCK`, `TRANSFERIR_STOCK`, `VER_REPORTES`), aplicados con `@PreAuthorize` en cada controller. Las lecturas de catálogo (sucursales, categorías, productos, clientes) solo requieren autenticación.
- Los roles son por empresa: cada empresa ve y gestiona únicamente los suyos. Un rol desactivado deja a sus usuarios sin permisos.
- CORS está abierto a cualquier origen: restringilo antes de desplegar a producción.

## Desarrollo

```bash
# Backend: tests
cd backend && ./mvnw test

# Frontend: lint
cd frontend/erp-system && npm run lint
```

El detalle del frontend (arquitectura, convenciones y contexto para agentes) está en [frontend/erp-system/AGENTS.md](frontend/erp-system/AGENTS.md). [FRONTEND_DOCS.md](frontend/erp-system/FRONTEND_DOCS.md) quedó desactualizado: todavía describe el frontend con datos mock, aunque los módulos de órdenes, productos, clientes, sucursales e inventario ya consumen la API real.
