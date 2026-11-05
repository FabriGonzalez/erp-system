# Etapa 22B — Cuentas de comprador y mails (backend)

Plan detallado de la segunda parte de la etapa 22 (plan general en `docs/plan-proximas-etapas.md`, sección "22B"). Rama: `feature/store-22b`, desde `feature/store-22a`. Alcance: backend, más la marca "Web" en el frontend del ERP (la única excepción de la decisión 8 de 22A).

Estado al 2026-11-04: paso 1 commiteado (aa310a4); paso 2 hecho, sin commitear hasta la revisión del usuario.

## Lo que hay hoy (relevado el 2026-11-04)

- `Customer` sin credenciales ni origen; su email no es único. Ya existe `CustomerAccount`, que es la **cuenta corriente**: la cuenta web no puede llamarse así.
- `Address` (de `Customer`) con la regla "exactamente una principal" en la entidad: se reutiliza tal cual.
- `JwtUtil` firma el token del ERP con `app.jwt.secret` y `subject = username`; el `JwtAuthFilter` busca al usuario por ese `subject`. **Si el token del comprador usara la misma clave, uno con `subject` igual a un usuario del ERP entraría al ERP como ese empleado.** Por eso la tienda usa clave propia (ver paso 2).
- La cadena de `/store/**` es pública y resuelve la empresa por dominio (`CurrentStore`). No hay mail (ni dependencia ni servidor en docker-compose). El límite de intentos (`LoginAttemptService`) es del login del ERP y vive en memoria.
- Contraseñas del ERP: 8 a 72 caracteres, con letras y números (`ChangePasswordRequest`).
- `Order` tiene `customer`, pero no `channel` (llega en 22C).

## Decisiones (del plan general)

- Compra **solo con cuenta**. Registrarse **siempre crea un `Customer` nuevo** con `origin = WEB`; nunca se vincula con uno del ERP aunque coincida el email.
- La tienda nunca expone cuenta corriente, saldo, deuda, pagos fuera de sus pedidos web, notas internas ni pedidos del local.
- Mails: verificar el email, recuperar la contraseña (y en 22C, pedido confirmado).

## Propuesta para esta etapa

### Modelo y migración `V7__cuentas_tienda.sql`

- `customers.origin` (`ERP`/`WEB`, `NOT NULL DEFAULT 'ERP'`, con CHECK): los existentes y los que carga el ERP quedan `ERP`. Aditiva: la app vieja no se rompe.
- `store_accounts` (la cuenta web): `customer_id` (único), `company_id`, `email` (único por empresa, en minúsculas), `password_hash` (BCrypt, como el ERP; opcional para las cuentas de Google), `google_subject` (opcional, único por empresa), `email_verified_at`, `password_changed_at`, `last_login_at`.
- `store_account_tokens`: verificación de email y recuperación de contraseña. Se guarda solo el **hash** del token (como una contraseña: si se filtra la base, los links no sirven), con tipo, vencimiento y `used_at` (un solo uso).
- El email de la cuenta es el de login; `Customer.email` arranca con el mismo. Si el ERP edita el email de la ficha, el login no cambia.

### 1. Origen del cliente en el ERP (backend)

- `GET /customers` suma el campo `origin` y el filtro `?origin=ERP|WEB`. El alta y la edición del ERP siempre dejan `ERP`.

### 2. Registro, login y token de comprador

- `POST /store/auth/register` (nombre, apellido, email, contraseña, teléfono opcional) y `POST /store/auth/login`.
- **Token propio de la tienda:** otra clave (`STORE_JWT_SECRET`), claim `type=customer`, `companyId` y la cuenta. El filtro de la tienda exige que el `companyId` del token sea el de la tienda del dominio: un comprador de la tienda A no entra a la B. El ERP no lo acepta (otra clave) y la tienda no acepta el del ERP.
- `/store/me/**` exige el token de comprador; el resto de `/store/**` sigue público.
- Un cliente desactivado en el ERP no puede iniciar sesión (y su token deja de valer).
- Cambiar la contraseña invalida los tokens anteriores (`password_changed_at`, como el ERP).
- Límite de intentos por email y por IP en login, registro y recuperación (mismo mecanismo que el ERP, en memoria).
- **Hecho en el paso 2 (2026-11-04):** la clave del token se **deriva** de `JWT_SECRET` (HMAC con un contexto propio) en vez de una variable nueva: es otra clave y no hay que configurar nada. El registro no devuelve token (responde 202 siempre); el sitio inicia sesión después. El login limita por cuenta (clave con la empresa) y por IP con `LoginAttemptService`. El límite del registro pasa al paso 3, junto con el de recuperación.
- **A decidir antes de habilitar la tienda — la IP real detrás del sitio Next.js:** con BFF todos los pedidos llegan desde la IP del servidor de la tienda, así que el límite por IP (30 fallos) frenaría a **todos** los compradores a la vez. Propuesta: el sitio manda la IP del comprador en un header y una clave compartida (`STORE_BFF_SECRET`); el backend usa ese header solo si la clave coincide (si no, cualquiera inventaría IPs).

### 3. Mails

- `spring-boot-starter-mail` por **SMTP genérico**: sirve cualquier proveedor cambiando variables (`MAIL_*`). En desarrollo, **Mailpit** en docker-compose (el sucesor de MailHog, que ya no se mantiene): captura los mails y los muestra en una página local.
- Plantillas simples (HTML y texto) con el nombre de la tienda. Los links apuntan al dominio de la tienda (`https://{storeDomain}/...`).
- El mail se manda **después del commit**: si la transacción falla no sale un mail de algo que no pasó, y si el mail falla el registro no se pierde (queda el reenvío).
- `POST /store/auth/verify-email`, `resend-verification`, `forgot-password` y `reset-password`. Tokens de verificación: 48 h; de recuperación: 1 h; un solo uso.
- `forgot-password` responde siempre lo mismo, exista o no el email (no revela quién tiene cuenta).

### 4. Perfil y direcciones

- `GET/PATCH /store/me` (nombre, apellido, teléfono; el email no se cambia en esta etapa) y `PATCH /store/me/password`.
- `GET/POST /store/me/addresses`, `PATCH/DELETE /store/me/addresses/{id}`: reutilizan `Address` y su regla de principal. Borrar = desactivar, como en el ERP.
- Respuestas propias de la tienda (`Store*Response`): nunca `CustomerResponse` del ERP.

### 5. Marca "Web" en el ERP (frontend)

- Píldora "Web" en el listado y la ficha del cliente, y filtro por origen en el listado.

### Fuera de 22B

- **"Mis pedidos" pasa a 22C** (cambio respecto del plan general): necesita `Order.channel` para no mostrar ventas del local cargadas a la ficha, y antes de 22C no hay pedidos web.
- Cambiar el email de la cuenta, borrar la cuenta.

## Commits previstos

Cada paso es un commit, con su revisión antes:

| Paso | Qué | Archivos aprox. |
|---|---|---|
| 1 | Migración V7, entidades, origen en `GET /customers` | 10 |
| 2 | Registro, login, token y filtro de comprador | 14 |
| 3 | Mails, Mailpit, verificación y recuperación | 14 |
| 4 | Perfil y direcciones | 10 |
| 5 | Marca "Web" en el ERP (frontend) | 5 |
| 6 | Inicio con Google | 6 |

## Decisiones del usuario (2026-11-04)

1. **Sitio de la tienda en React con Next.js** ("casi seguro"): servidor propio (BFF). El token del comprador lo guarda el servidor de la tienda; alcanza un token único de vida media (7 días, como el ERP), **sin `/store/auth/refresh` en 22B**. Un solo sitio Next.js atiende todas las tiendas: lee el dominio del request y lo manda en `X-Store-Domain`.
2. **Registro con un email que ya tiene cuenta:** se responde igual que un registro nuevo y al dueño le llega un mail "ya tenés cuenta, ¿olvidaste la contraseña?". Nadie averigua quién es cliente probando emails.
   - **Cuentas por tienda:** el email es único **dentro de cada empresa**, no en toda la plataforma. La misma persona se registra en la tienda A y en la B por separado: dos cuentas, dos contraseñas, dos fichas de cliente, cada una en su empresa. Una tienda nunca ve que la persona tiene cuenta en otra. Es lo que hacen Shopify y Tiendanube.
3. **Se inicia sesión sin verificar el email**, para no perder ventas; la verificación no bloquea nada en 22B (si se exige al pagar se decide en 22C).
4. **Proveedor de mail de producción:** más adelante (va al checklist "Antes de habilitar una tienda"). En 22B, SMTP genérico + Mailpit.
5. **"Mis pedidos" pasa a 22C.**

6. **Inicio con Google en 22B, como paso 6** (pedido del usuario; aceptado con el "dale" del 2026-11-04), después del login con contraseña.

## Inicio con Google (propuesta)

- **Cómo funciona:** el sitio Next.js muestra "Continuar con Google"; Google devuelve un *ID token* (un JWT firmado por Google con el email y si está verificado). El sitio se lo pasa al backend en `POST /store/auth/google`; el backend verifica la firma con las claves públicas de Google, que sea para nuestra app (`audience`) y que no esté vencido. Si todo está bien, busca o crea la cuenta **de esa tienda** y devuelve nuestro token de comprador, igual que el login con contraseña.
- **Modelo:** `store_accounts.password_hash` pasa a opcional y se suma `google_subject` (el id fijo de la persona en Google). Se deja preparado así en la migración V7 aunque Google se haga después, para no migrar dos veces.
- **Email ya registrado con contraseña:** si Google confirma el email (`email_verified`), se vincula a la cuenta existente de esa tienda y queda verificada. Es lo habitual y es seguro porque Google ya probó que la persona controla el email.
- **Lo de afuera del código:** una app en Google Cloud con su pantalla de consentimiento (nombre, logo y política de privacidad), y cada dominio de tienda cargado como origen autorizado. Pidiendo solo email y perfil, Google no exige la revisión larga.
- **Costo:** unos 6 archivos en el backend (sin dependencia nueva: la firma se verifica con la librería JWT que ya usamos o con la de Google). El botón y el flujo del lado del sitio quedan para el proyecto Next.js.

## Criterios de aceptación

- Registrarse crea un `Customer` `WEB` nuevo aunque exista uno del ERP con el mismo email; el del ERP no cambia.
- El token del comprador no entra a ningún endpoint del ERP y el del ERP no entra a `/store/me/**`.
- Un comprador de la tienda A no puede usar su token en la tienda B.
- Tokens de verificación y recuperación: vencidos o usados → rechazados.
- Cliente desactivado en el ERP → no inicia sesión.
- Ninguna respuesta de `/store/**` trae saldo, deuda, observaciones ni datos de otros clientes.
- Tests de aislamiento entre empresas y entre tipos de token contra Postgres.

## Validación

- Backend: `./mvnw test` en la copia del scratchpad (con Docker para Testcontainers).
- Mails: probar el circuito con Mailpit (registro → mail → verificar; olvidé → mail → nueva contraseña).
- Migración `V7` sobre una copia de la base de desarrollo antes de staging.
- Frontend del ERP (paso 5): `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`; la UI la prueba el usuario.
