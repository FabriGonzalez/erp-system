# Etapa 22B — Cuentas de comprador y mails (backend)

Plan detallado de la segunda parte de la etapa 22 (plan general en `docs/plan-proximas-etapas.md`, sección "22B"). Rama: `feature/store-22b`, desde `feature/store-22a`. Alcance: backend, más la marca "Web" en el frontend del ERP (la única excepción de la decisión 8 de 22A).

Estado al 2026-11-09: pasos 1 (aa310a4), 2 (4352ce5), 3a (9038974), 3b (6aac455), 3c (46ff9ba, bf9e783) 4a (7fa325f), 4b (86228f6), 5 y 6 hechos.

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
- El email de la cuenta es el de login; `Customer.email` arranca con el mismo. Desde el paso 4b el ERP no puede editar el email de una ficha web.

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

### 3a. Mails y verificación del email (hecho el 2026-11-05)

- `spring-boot-starter-mail` por **SMTP genérico**: sirve cualquier proveedor cambiando variables (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_SMTP_AUTH`, `MAIL_STARTTLS`, `MAIL_FROM`). En desarrollo, **Mailpit** en docker-compose (el sucesor de MailHog, que ya no se mantiene): captura los mails y los muestra en `http://localhost:8025`.
- Remitente: `MAIL_FROM` con el nombre de la tienda como nombre visible ("Tienda X <no-reply@…>"). El remitente por tienda es el paso 3c.
- Links: `{STORE_LINK_SCHEME}://{dominio}[:{STORE_LINK_PORT}]/cuenta/verificar?token=…` (por defecto `https` sin puerto; en desarrollo `http` y `3000`). La página del sitio consume el token y lo saca de la URL.
- **Registro pendiente (V8, `store_pending_registrations`):** registrarse no crea ni la cuenta ni la ficha; guarda los datos (con el hash de la contraseña) y el hash del token del link, que vence en 48 h. `POST /store/auth/verify-email` crea la cuenta (ya verificada) y la ficha WEB **con los datos de ese registro** y borra los demás pendientes del email. Así un registro ajeno con el mismo email nunca termina siendo la cuenta (si se reutilizara un registro pendiente, el dueño verificaría la cuenta con la contraseña del intruso) y el ERP solo ve clientes verificados.
- Login con un registro pendiente y la contraseña correcta → 403 `EMAIL_NOT_VERIFIED`; con otra contraseña, el 401 de siempre.
- `POST /store/auth/resend-verification {email}`: público (sin verificar no se puede entrar), responde 202 siempre y renueva el link del último pendiente (el anterior deja de servir).
- Registro con un email que ya tiene cuenta: 202 igual y al dueño le llega "ya tenés cuenta, ¿olvidaste la contraseña?".
- Registro y reenvío: cada pedido cuenta para el límite (5 por email y tienda, 30 por IP, cada 15 minutos; contadores de IP separados de los del login).
- El mail se manda **después del commit y en otro hilo** (`@TransactionalEventListener` + `@Async`): si la transacción falla no sale un mail de algo que no pasó; si el mail falla queda en el log y el reenvío; y la respuesta tarda lo mismo mande o no mail.
- `store_account_tokens` queda para la recuperación (3b); el tipo `EMAIL_VERIFICATION` no se usa.

### 3b. Recuperación de contraseña (hecho el 2026-11-06)

- `POST /store/auth/forgot-password {email}`: responde 202 siempre y cuenta para el límite como el registro (clave `store-forgot`). Con una cuenta de esta tienda, ficha activa y contraseña, anula los links de recuperación sin usar y manda uno nuevo a `/cuenta/restablecer?token=…` (1 h, un solo uso, hash en `store_account_tokens`). Sin cuenta, con el registro sin verificar, con la ficha desactivada o con una cuenta solo de Google, no manda nada.
- `POST /store/auth/reset-password {token, password}`: misma regla de contraseña que el registro. Link vencido, usado, de otra tienda o de una ficha desactivada → 400 `INVALID_LINK`. Al cambiarla se cierran las sesiones abiertas (`password_changed_at`), se limpia el contador de fallos del login y llega el mail "cambió tu contraseña". Responde 204 y el sitio lleva al login.
- **Decisiones del 2026-11-06:** se manda el aviso de cambio; a un registro sin verificar no se le manda nada; las cuentas creadas con Google no reciben contraseña por esta vía (se entra siempre con Google).

### 3c. Remitente por tienda (hecho el 2026-11-06)

- Campo opcional en la empresa, cargado por el administrador de la plataforma en el aprovisionamiento. Sin él, `MAIL_FROM`. Cada dominio necesita sus registros DNS (SPF/DKIM) en el proveedor de mail.
- **Hecho:** columna `companies.store_mail_from` (V9). Se carga con `storeMailFrom` en `PATCH /provisioning/companies/{id}/store` (validado como email, guardado en minúsculas). `CurrentStore` lo lleva al evento del mail y `StoreMailSender` lo usa como dirección, con el nombre de la tienda como nombre visible; si está vacío, `MAIL_FROM`.
- **Decisiones del 2026-11-06:** no se exige que el remitente sea del dominio de la tienda (el control real es el DNS); el pedido es la configuración completa, así que mandarlo sin `storeMailFrom` lo borra (igual que el dominio); sin Reply-To, los mails son solo de aviso.

### 4a. Perfil y direcciones del comprador

- `GET/PATCH /store/me` (nombre, apellido, teléfono; el email no se cambia en esta etapa) y `PATCH /store/me/password`.
- `GET/POST /store/me/addresses`, `PATCH/DELETE /store/me/addresses/{id}`: reutilizan `Address` y su regla de principal. Borrar = desactivar, como en el ERP.
- Respuestas propias de la tienda (`Store*Response`): nunca `CustomerResponse` del ERP.

- **Decisiones del 2026-11-09 (4a):** cambiar la contraseña pide la actual (un fallo cuenta para el límite de intentos), cierra las demás sesiones, avisa por mail y devuelve un token nuevo; una cuenta solo de Google recibe 400 `PASSWORD_NOT_SET` y `GET /store/me` trae `hasPassword`. `PATCH /store/me` es el formulario completo: un teléfono vacío o ausente se borra. Hasta 5 direcciones activas por comprador (409 `ADDRESS_LIMIT_REACHED`); las borradas no cuentan. `AddressService` no se reutiliza porque saca la empresa del empleado; sí la entidad, el mapper y la regla de principal.

### 4b. Ficha web protegida en el ERP

- En un cliente `WEB` el ERP no puede cambiar nombre, apellido, teléfono ni email, ni crear, editar, activar o desactivar direcciones: 409 `CUSTOMER_MANAGED_BY_STORE`, chequeado en el backend.
- Sí puede activar o desactivar la ficha, editar observaciones y documento, venderle y registrar sus pagos.
- El formulario del ERP manda todos los campos: los valores se comparan normalizados (espacios, mayúsculas del email, vacío = ausente), y solo un cambio real da 409. Un campo que no llega cuenta como borrarlo, así que también da 409.

### 5. Marca "Web" en el ERP (frontend)

- Píldora "Web" en el listado y la ficha del cliente, y filtro por origen en el listado.
- En las fichas web, los datos del comprador de solo lectura y sin botones de direcciones.
- **Decisiones del 2026-11-09 (5):** el filtro es una segunda fila de chips, "Todos · Local · Web", con "Todos" por defecto. El formulario de pedidos tampoco ofrece agregar direcciones a un cliente web: sin direcciones no se le puede hacer un envío hasta que cargue una en la tienda.

### Fuera de 22B

- **"Mis pedidos" pasa a 22C** (cambio respecto del plan general): necesita `Order.channel` para no mostrar ventas del local cargadas a la ficha, y antes de 22C no hay pedidos web.
- Cambiar el email de la cuenta, borrar la cuenta.

## Commits previstos

Cada paso es un commit, con su revisión antes:

| Paso | Qué | Archivos aprox. |
|---|---|---|
| 1 | Migración V7, entidades, origen en `GET /customers` | 10 |
| 2 | Registro, login, token y filtro de comprador | 14 |
| 3a | Mails, Mailpit, registro pendiente y verificación | 20 |
| 3b | Recuperación de contraseña | 9 |
| 3c | Remitente por tienda | 5 |
| 4a | Perfil y direcciones del comprador | 15 |
| 4b | Ficha web protegida en el ERP | 5 |
| 5 | Marca "Web" y solo lectura en el ERP (frontend) | 11 |
| 6 | Inicio con Google | 14 |

## Decisiones del usuario (2026-11-04)

1. **Sitio de la tienda en React con Next.js** ("casi seguro"): servidor propio (BFF). El token del comprador lo guarda el servidor de la tienda; alcanza un token único de vida media (7 días, como el ERP), **sin `/store/auth/refresh` en 22B**. Un solo sitio Next.js atiende todas las tiendas: lee el dominio del request y lo manda en `X-Store-Domain`.
2. **Registro con un email que ya tiene cuenta:** se responde igual que un registro nuevo y al dueño le llega un mail "ya tenés cuenta, ¿olvidaste la contraseña?". Nadie averigua quién es cliente probando emails.
   - **Cuentas por tienda:** el email es único **dentro de cada empresa**, no en toda la plataforma. La misma persona se registra en la tienda A y en la B por separado: dos cuentas, dos contraseñas, dos fichas de cliente, cada una en su empresa. Una tienda nunca ve que la persona tiene cuenta en otra. Es lo que hacen Shopify y Tiendanube.
3. ~~Se inicia sesión sin verificar el email~~ **Cambiado el 2026-11-05: el email se verifica al crear la cuenta.** Sin verificar no hay cuenta ni ficha (ver 3a); así nadie usa una cuenta con un email ajeno y el ERP no se llena de fichas basura.
4. **Proveedor de mail de producción:** más adelante (va al checklist "Antes de habilitar una tienda"). En 22B, SMTP genérico + Mailpit.
5. **"Mis pedidos" pasa a 22C.**

6. **Inicio con Google en 22B, como paso 6** (pedido del usuario; aceptado con el "dale" del 2026-11-04), después del login con contraseña.

7. **Decisiones del 2026-11-05:** reenvío de la verificación público con email; links en `/cuenta/verificar` y `/cuenta/restablecer`; remitente por tienda como paso 3c, cargado por el administrador de la plataforma; **captcha** en los formularios del sitio (p. ej. Cloudflare Turnstile) al checklist "Antes de habilitar una tienda"; borrar registros pendientes vencidos de forma automática, más adelante si hace falta.

## Inicio con Google (propuesta)

- **Cómo funciona:** el sitio Next.js muestra "Continuar con Google"; Google devuelve un *ID token* (un JWT firmado por Google con el email y si está verificado). El sitio se lo pasa al backend en `POST /store/auth/google`; el backend verifica la firma con las claves públicas de Google, que sea para nuestra app (`audience`) y que no esté vencido. Si todo está bien, busca o crea la cuenta **de esa tienda** y devuelve nuestro token de comprador, igual que el login con contraseña.
- **Modelo:** `store_accounts.password_hash` pasa a opcional y se suma `google_subject` (el id fijo de la persona en Google). Se deja preparado así en la migración V7 aunque Google se haga después, para no migrar dos veces.
- **Email ya registrado con contraseña:** si Google confirma el email (`email_verified`), se vincula a la cuenta existente de esa tienda y queda verificada. Es lo habitual y es seguro porque Google ya probó que la persona controla el email.
- **Lo de afuera del código:** una app en Google Cloud con su pantalla de consentimiento (nombre, logo y política de privacidad), y cada dominio de tienda cargado como origen autorizado. Pidiendo solo email y perfil, Google no exige la revisión larga.
- **"Último usado" en el login** (pedido del 2026-11-06, como Render o Neon): el sitio guarda en `localStorage` el método con el que se entró (Google o contraseña) y marca ese botón. No toca el backend; va con el login del sitio Next.js.
- **Del lado del sitio:** el botón y el flujo quedan para el proyecto Next.js.

### 6. Hecho el 2026-11-09

- `POST /store/auth/google {idToken}`, público. `GoogleTokenVerifier` valida firma, emisor, `audience` y vencimiento con `spring-security-oauth2-jose` (cambio respecto de "sin dependencia nueva": la librería baja, guarda y renueva las claves de Google). Client ID único de la plataforma en `GOOGLE_CLIENT_ID`; vacío = 503 `GOOGLE_LOGIN_DISABLED`, y si no se llega a Google, 503 `GOOGLE_LOGIN_UNAVAILABLE`.
- Busca primero por `google_subject` (el email de Google puede haber cambiado). Si no está vinculada: exige `email_verified`, vincula por email o crea cuenta sin contraseña y ficha `WEB`, y borra los registros pendientes del email. Cualquier rechazo es 401 `GOOGLE_LOGIN_FAILED`.
- Sin migración: V7 ya dejó el modelo preparado. Sin límite de intentos: un token de Google no se adivina, y limitar por IP frenaría a todos los compradores detrás del BFF.
- El login con contraseña compara también en las cuentas sin contraseña (mismo tiempo de respuesta), y el mail "ya tenés cuenta" lleva a esas cuentas a "Continuar con Google".
- **Decisiones del 2026-11-09 (6):** sin nombre en Google la ficha queda vacía y lo completa el comprador en "Mi perfil" (22C debe pedirlo antes de confirmar la compra); un email vinculado a otro id de Google se rechaza; vincular no manda mail.
- **Límite conocido:** hay una sola app de Google para todas las tiendas, así que un ID token filtrado sirve en otra tienda hasta que vence (1 hora). El `nonce` del flujo lo maneja el sitio Next.js.
- **Antes de habilitar una tienda:** crear la app en Google Cloud, cargar `GOOGLE_CLIENT_ID` y agregar cada dominio como origen autorizado.

## Criterios de aceptación

- Registrarse crea un `Customer` `WEB` nuevo aunque exista uno del ERP con el mismo email; el del ERP no cambia.
- El token del comprador no entra a ningún endpoint del ERP y el del ERP no entra a `/store/me/**`.
- Un comprador de la tienda A no puede usar su token en la tienda B.
- Tokens de verificación y recuperación: vencidos o usados → rechazados.
- Sin verificar el email no hay cuenta ni ficha; el link de un registro ajeno con el mismo email nunca se convierte en la cuenta.
- Cliente desactivado en el ERP → no inicia sesión.
- Ninguna respuesta de `/store/**` trae saldo, deuda, observaciones ni datos de otros clientes.
- Tests de aislamiento entre empresas y entre tipos de token contra Postgres.

## Validación

- Backend: `./mvnw test` en la copia del scratchpad (con Docker para Testcontainers).
- Mails: probar el circuito con Mailpit (registro → mail → verificar; olvidé → mail → nueva contraseña).
- Migración `V7` sobre una copia de la base de desarrollo antes de staging.
- Frontend del ERP (paso 5): `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`; la UI la prueba el usuario.
