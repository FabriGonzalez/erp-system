# Contratos del backend para la tienda web

Relevado del código el 2026-11-16 (rama `feature/store-22c`, después de 1729a7c). Describe lo que el backend hace **hoy**. La fuente de verdad sigue siendo el código y Swagger (`/swagger-ui.html`, solo con el perfil `dev`); si algo de acá no coincide, manda el código.

Dos consumidores:

1. **Tienda pública**: el sitio que ve el comprador. Usa `/api/v1/store/**`.
2. **Panel de la tienda**: lo usa un empleado de la empresa con el permiso `ADMINISTRAR_TIENDA`. Usa endpoints del ERP con el token del ERP.

---

## 1. Generales

### Cómo lo consume la tienda: BFF con Next.js

Decidido en 22A y 22B (`etapa-22a-tienda.md`, "Dirección elegida"; `etapa-22b-cuentas.md`, decisión 1). La API no sabe nada de esto: lo arma el sitio.

```
Navegador ──cookie HttpOnly──▶ Servidor Next.js ──Authorization + X-Store-Domain──▶ API
          (dominio de la tienda)  (guarda el token del comprador)
```

- **Un solo sitio Next.js atiende todas las tiendas.** Lee el dominio del request (`Host`) y lo manda a la API en `X-Store-Domain`. Desde el servidor no hay `Origin`, así que ese header es **obligatorio**.
- **El token del comprador nunca llega al navegador.** Cuando el login (`/store/auth/login` o `/store/auth/google`) devuelve el token, el servidor de Next lo guarda en su sesión y le da al navegador una cookie `HttpOnly` propia del dominio de la tienda. En cada pedido a `/store/me/**`, el servidor busca el token de esa sesión y lo manda en `Authorization: Bearer`. Así, un XSS en la tienda no puede robar la sesión.
- **Por qué no cookies directo desde la API:** la API está en otro dominio, así que sería una cookie de terceros, y Safari, Firefox y Brave las bloquean o las restringen. Por eso la API sigue sin cookies.
- **No es un segundo backend:** el servidor de Next no tiene base de datos ni reglas de negocio. Solo arma páginas, guarda la sesión y reenvía.
- **Vencimiento:** el token dura 7 días y **no hay `/store/auth/refresh`**. Cuando la API responde 401 en `/store/me/**`, el sitio borra su sesión y manda al login. La cookie no debería durar más que el token.
- **Cambio de contraseña:** `PATCH /me/password` devuelve un token nuevo y el servidor de Next tiene que reemplazar el de la sesión, porque el anterior deja de valer.
- **Mails:** los links `/cuenta/verificar?token=…` y `/cuenta/restablecer?token=…` son páginas del sitio. El servidor lee el `token` de la URL y lo manda a la API.
- **Lo que llama directo el navegador:** solo la redirección a `paymentUrl` (Mercado Pago) y las fotos (`coverImageUrl`, `images`, que son URLs públicas del almacenamiento).

### Resolución de la tienda (solo `/api/v1/store/**`)

La empresa sale del dominio, nunca de un token:

- Header `X-Store-Domain` (para la tienda renderizada en servidor, o para probar desde Swagger) o, si no viene, `Origin` (navegador).
- Si el dominio no tiene tienda, la tienda está deshabilitada o la empresa no está activa: **404 `STORE_NOT_FOUND`** en cualquier endpoint de `/store/**`. Es 404 y no 403 a propósito: no revela si la empresa existe.

### CORS (solo `/api/v1/store/**`)

Con el BFF no se usa, porque los pedidos salen del servidor de Next y no del navegador. Queda configurado por si algún pedido público (por ejemplo, el catálogo) se hace desde el navegador.

- Solo se admite como `Origin` un dominio de tienda registrado y habilitado (la lista sale de la base, no es fija).
- Métodos: `GET`, `POST`, `PATCH`, `DELETE`, `OPTIONS`. Headers: `Authorization`, `Content-Type`, `X-Store-Domain`.
- **Sin cookies** (`allowCredentials = false`): el comprador se identifica con el token en `Authorization`.

### Autenticación del comprador

- `POST /store/auth/login` o `/store/auth/google` devuelven `{ "token": "...", "type": "Bearer" }`. El token vence a los **7 días**.
- Se manda como `Authorization: Bearer <token>`. Lo exigen `/store/me` y todo `/store/me/**`; el resto de `/store/**` es público.
- El token se firma con una clave propia de la tienda, distinta de la del ERP: un token de empleado no sirve en la tienda ni al revés.
- Un token de la tienda A no vale en la tienda B (se compara la empresa del token con la del dominio).
- Un token deja de valer si la contraseña cambió después de emitirlo, o si la ficha del cliente está inactiva.
- Un token inválido no corta el request: el catálogo sigue respondiendo y `/store/me/**` da **401**.

### Formato de error

```json
{
  "timestamp": "2026-11-16T12:00:00Z",
  "status": 409,
  "error": "Conflict",
  "message": "texto técnico, en inglés",
  "path": "/api/v1/store/me/checkout",
  "code": "CART_CHANGED"
}
```

- `code` es lo que el sitio tiene que usar para decidir qué mostrar; `message` es para logs. `code` se omite cuando no hay uno específico.
- Validación de campos: **400 `VALIDATION_ERROR`**, con `message` = `campo: motivo; campo: motivo`.
- El checkout y la cancelación de pedidos usan una variante (`StoreCheckoutErrorResponse`) que suma `quote`: la cotización actual del carrito, cuando el problema es el carrito.

### Paginación

```json
{ "content": [ ... ], "page": 0, "size": 24, "totalElements": 130, "totalPages": 6 }
```

`page` es base 0.

### Tipos compartidos

- `availability` (`StoreAvailability`): `AVAILABLE`, `LOW_STOCK`, `OUT_OF_STOCK`. Nunca se expone la cantidad exacta.
- `deliveryType`: `LOCAL_PICKUP` o `SHIPPING`.
- `fulfillment` (`StoreFulfillment`): `SINGLE_BRANCH`; `MULTIPLE_BRANCHES` (hay stock sumando sucursales pero ninguna lo arma sola: el sitio avisa que puede demorar); `UNAVAILABLE` (alguna línea no se puede comprar, o el carrito está vacío).
- `attributes` (`Attribute`): `{ "name", "value", "swatch" }`, ordenados por nombre. `swatch` es la muestra de color que se carga en el ERP en el valor del atributo: `{ "colors": ["#000000", "#FFFFFF"] }`, de 1 a 5 colores `#RRGGBB` en mayúsculas, el primero es el primario; `null` si el valor no tiene muestra. Cómo se dibuja (liso, rayas, mitades) lo decide la tienda. Viene igual en el catálogo y en los pedidos.
- Precios: `BigDecimal` en ARS, siempre **precio web** (precio del ERP con el ajuste y el redondeo de la tienda).
- Fechas: `Instant` en ISO-8601 UTC; `endDate` de promos es `LocalDate` (`2026-11-30`).

---

## 2. Tienda pública

Todas las rutas cuelgan de `/api/v1/store`. Todas pueden responder 404 `STORE_NOT_FOUND` (ver arriba).

### 2.1 Catálogo (público)

#### `GET /info`

Lo primero que pide el sitio: confirma que la tienda existe.

```json
{ "name": "El Yuyei", "domain": "elyuyei.test" }
```

#### `GET /categories`

Categorías activas con al menos un producto visible, ordenadas por nombre.

```json
[ { "id": 3, "name": "Buzos" } ]
```

#### `GET /products`

Paginado. Solo productos visibles: activos, publicados, de categoría activa y con alguna variante activa.

| Parámetro | Default | Notas |
|---|---|---|
| `q` | — | Busca en el nombre, sin distinguir mayúsculas ni tildes |
| `categoryId` | — | |
| `page` | `0` | ≥ 0 |
| `size` | `24` | 1 a 48 |
| `sort` | `name,asc` | `name` o `price`, con `,asc` o `,desc` |

Página, tamaño u orden inválidos: 400.

`content[]` (`StoreProductSummaryResponse`):

```json
{
  "id": 4, "name": "Buzo", "categoryId": 3, "categoryName": "Buzos",
  "coverImageUrl": "https://...",
  "minPrice": 25000, "maxPrice": 28000,
  "availability": "AVAILABLE"
}
```

`coverImageUrl` puede ser `null` (por ejemplo, si las únicas fotos son de variantes desactivadas). En el listado `availability` es solo `AVAILABLE` u `OUT_OF_STOCK`.

#### `GET /products/{id}`

Producto oculto, inexistente o de otra tienda: 404.

```json
{
  "id": 4, "name": "Buzo", "description": "...",
  "categoryId": 3, "categoryName": "Buzos",
  "images": ["https://..."],
  "minPrice": 25000, "maxPrice": 28000,
  "variants": [
    {
      "id": 11,
      "attributes": [ { "name": "Color", "value": "Negro", "swatch": { "colors": ["#000000"] } }, { "name": "Talle", "value": "M", "swatch": null } ],
      "price": 25000,
      "images": ["https://..."],
      "availability": "LOW_STOCK"
    }
  ]
}
```

Solo variantes activas. Las `images` de una variante son las suyas o, si no tiene, las del producto. Sin SKU, costos ni sucursales.

#### `GET /promotions`

Promos vigentes hoy cuyos productos son todos visibles, las que vencen antes primero. Sin paginar.

```json
[
  {
    "id": 2, "name": "2 buzos", "description": "...",
    "webPrice": 45000,
    "regularWebPrice": 50000, "savings": 5000,
    "availability": "AVAILABLE",
    "endDate": "2026-11-30",
    "items": [
      { "productId": 4, "productName": "Buzo", "quantity": 2, "coverImageUrl": "https://..." }
    ]
  }
]
```

- `regularWebPrice` y `savings` comparan con comprar por separado la variante más barata de cada producto. Los dos son `null` si la promo no conviene.
- `availability`: `AVAILABLE` u `OUT_OF_STOCK`.
- La variante de cada unidad la elige el comprador al armar el carrito.

### 2.2 Carrito (público)

El carrito vive en el sitio; el backend solo lo cotiza.

#### `POST /cart/quote`

Request (`StoreCartRequest`):

```json
{
  "items": [ { "productVariantId": 11, "quantity": 1 } ],
  "promos": [
    {
      "promotionId": 2,
      "quantity": 1,
      "variants": [
        { "productVariantId": 11, "quantity": 1 },
        { "productVariantId": 12, "quantity": 1 }
      ]
    }
  ]
}
```

- Hasta 50 `items` y 50 `promos`; cantidades de 1 a 999; hasta 50 `variants` por promo.
- `promos[].variants`: las unidades de cada variante **por cada promo** de la línea.

Response (`StoreCartQuoteResponse`):

```json
{
  "items": [
    { "productVariantId": 11, "productName": "Buzo", "quantity": 1,
      "unitPrice": 25000, "lineTotal": 25000, "status": "AVAILABLE" }
  ],
  "promos": [
    { "promotionId": 2, "name": "2 buzos", "quantity": 1,
      "unitPrice": 45000, "lineTotal": 45000, "status": "AVAILABLE" }
  ],
  "total": 70000,
  "fulfillment": "SINGLE_BRANCH",
  "pickupBranches": [ { "id": 1, "name": "Gral. Pico", "address": "..." } ]
}
```

- `status` por línea: `AVAILABLE`; `INSUFFICIENT_STOCK` (se vende, pero no alcanza para esa cantidad); `UNAVAILABLE` (despublicado, inactivo, promo vencida o variantes que no la completan). En `UNAVAILABLE`, el nombre y los precios vienen en `null`.
- `total` suma solo las líneas `AVAILABLE`. **No incluye envío.**
- `promos` vuelven en el mismo orden en que llegaron.
- `pickupBranches`: sucursales que pueden armar el pedido completo; son las únicas válidas para retiro.
- No reserva stock. El sitio compara los precios con los que tenía guardados para avisar cambios.

### 2.3 Cuenta del comprador

Contraseñas (registro, cambio y restablecimiento): 8 a 72 caracteres, con letras y números.

#### Públicos (`/auth/**`)

| Endpoint | Request | Respuesta | Errores |
|---|---|---|---|
| `POST /auth/register` | `{ firstName, lastName, email, password, phone? }` | **202** sin cuerpo | 400, 429 |
| `POST /auth/verify-email` | `{ token }` | **204** | 400 `INVALID_LINK` |
| `POST /auth/resend-verification` | `{ email }` | **202** siempre | 429 |
| `POST /auth/login` | `{ email, password }` | **200** `{ token, type }` | 401 `INVALID_CREDENTIALS`, 403 `EMAIL_NOT_VERIFIED`, 429 |
| `POST /auth/google` | `{ idToken }` | **200** `{ token, type }` | 400, 401 `GOOGLE_LOGIN_FAILED`, 503 `GOOGLE_LOGIN_DISABLED` / `GOOGLE_LOGIN_UNAVAILABLE` |
| `POST /auth/forgot-password` | `{ email }` | **202** siempre | 429 |
| `POST /auth/reset-password` | `{ token, password }` | **204** | 400 (contraseña inválida o `INVALID_LINK`) |

Comportamiento que el sitio tiene que conocer:

- **Registro**: queda pendiente y llega un mail con link a `/cuenta/verificar?token=…` (vence en 48 h). La cuenta y la ficha de cliente (origen WEB) se crean recién al verificar. Responde 202 aunque el email ya tenga cuenta, para no revelarlo (al dueño le llega un aviso). Registrarse nunca vincula con una ficha del ERP, aunque coincida el email.
- **Verificar**: el sitio lee el `token` de la URL y lo manda. No inicia sesión: después se lleva al login.
- **Reenviar verificación**: manda un link nuevo y el anterior deja de servir.
- **Login**: exige el email verificado. Con la contraseña correcta y el email sin verificar responde 403 `EMAIL_NOT_VERIFIED` (el sitio puede ofrecer reenviar).
- **Google**: `idToken` es el ID token que Google le dio al sitio. Si el email ya tenía cuenta en esta tienda la vincula; si no, crea cuenta y ficha. Sin `GOOGLE_CLIENT_ID` configurado responde 503.
- **Olvidé mi contraseña**: link a `/cuenta/restablecer?token=…`, vence en 1 hora, un solo uso; los links anteriores dejan de servir.
- **Restablecer**: cierra todas las sesiones abiertas y avisa por mail. No inicia sesión.

Rutas del sitio que el backend pone en los mails: `/cuenta/verificar?token=…` y `/cuenta/restablecer?token=…`.

#### Con token (`/me`)

`GET /me` → `StoreMeResponse`:

```json
{
  "firstName": "Ana", "lastName": "Pérez", "email": "ana@mail.com",
  "phone": "2302...", "emailVerified": true, "hasPassword": true
}
```

`hasPassword = false` es una cuenta de Google: el sitio no ofrece cambiar la contraseña.

`PATCH /me` con `{ firstName, lastName, phone? }` → `StoreMeResponse`. Es el formulario completo: un `phone` vacío o ausente se borra. El email no se cambia.

`PATCH /me/password` con `{ currentPassword, newPassword }` → **200** `{ token, type }`.

- Cierra las demás sesiones, avisa por mail y devuelve un **token nuevo**: el sitio tiene que reemplazar el que tenía.
- Errores 400: contraseña inválida, `INVALID_CURRENT_PASSWORD`, `PASSWORD_UNCHANGED`, `PASSWORD_NOT_SET` (cuenta de Google). 429 si hay demasiados intentos fallidos.

### 2.4 Direcciones (con token)

Base: `/me/addresses`.

| Endpoint | Request | Respuesta | Errores |
|---|---|---|---|
| `GET /me/addresses` | — | 200 lista (principal primero) | |
| `POST /me/addresses` | `AddressRequest` | 201 | 400, 409 `ADDRESS_LIMIT_REACHED` |
| `PATCH /me/addresses/{id}` | `AddressRequest` | 200 | 400, 404 |
| `DELETE /me/addresses/{id}` | — | 204 | 404 |

`AddressRequest` (la dirección completa también en el PATCH):

| Campo | Reglas |
|---|---|
| `label` | ≤ 50 |
| `street` | **obligatorio**, ≤ 150 |
| `number` | ≤ 20 |
| `apartment`, `floor` | ≤ 20 |
| `city` | **obligatorio**, ≤ 100 |
| `state` | ≤ 100 |
| `postalCode` | ≤ 20 |
| `country` | ≤ 100 |
| `reference` | ≤ 200 |
| `mainAddress` | `true` la hace principal; `false` o ausente no le quita ese rol |

La respuesta (`StoreAddressResponse`) tiene los mismos campos más `id` y `mainAddress: boolean`.

- Hasta 5 activas. La primera queda como principal.
- Al borrar la principal, pasa a serlo la activa más antigua.
- Una dirección de otro comprador o ya borrada da 404.
- **Para comprar con envío** la dirección además tiene que tener `number`, `state` y `postalCode` (ver checkout, `ADDRESS_INCOMPLETE`).

### 2.5 Checkout (con token)

#### `POST /me/checkout`

Request (`StoreCheckoutRequest`):

```json
{
  "cart": { "items": [ ... ], "promos": [ ... ] },
  "deliveryType": "LOCAL_PICKUP",
  "pickupBranchId": 1,
  "addressId": null,
  "expectedTotal": 70000,
  "checkoutKey": "c0f1e2d3-a4b5-4c6d-8e7f-001122334455"
}
```

- `LOCAL_PICKUP` exige `pickupBranchId` (una de las `pickupBranches` de la cotización) y **no** `addressId`.
- `SHIPPING` exige `addressId` (una dirección activa del comprador) y **no** `pickupBranchId`.
- `expectedTotal`: el `total` de la cotización que vio el comprador, sin envío.
- `checkoutKey`: 16 a 64 caracteres, la genera el sitio **por intento de compra**. Repetirla devuelve el mismo pedido y el mismo link (sirve para el doble clic y para reintentar).

Response **201** (`StoreCheckoutResponse`):

```json
{
  "orderId": 57, "orderNumber": "...",
  "status": "PENDING_PAYMENT",
  "deliveryType": "LOCAL_PICKUP",
  "fulfillment": "SINGLE_BRANCH",
  "pickupBranch": { "id": 1, "name": "Gral. Pico", "address": "..." },
  "subtotal": 70000, "shippingCost": 0, "total": 70000,
  "paymentUrl": "https://www.mercadopago.com.ar/checkout/...",
  "paymentExpiresAt": "2026-11-16T12:30:00Z"
}
```

- `status` acá es el estado del ERP (`OrderStatus`), no el de "Mis pedidos".
- `paymentUrl`: el sitio redirige ahí. Es `null` si el pedido ya no espera el pago o venció la reserva.
- `paymentExpiresAt`: hasta cuándo se puede pagar. La reserva de stock y el link vencen juntos (**30 minutos** por defecto, `STORE_PAYMENT_WINDOW`).
- `shippingCost` hoy es **siempre 0**: el envío es "a coordinar" con la tienda (provider provisorio, ver sección 5).

Qué hace: valida perfil y entrega, revisa el tope de pedidos sin pagar, verifica que la tienda pueda cobrar, vuelve a cotizar, reserva stock, crea el pedido esperando el pago y pide el link a Mercado Pago.

Errores:

| Status | `code` | Qué significa / qué hace el sitio |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Campos inválidos |
| 400 | `INVALID_DELIVERY` | Combinación de `deliveryType` / `pickupBranchId` / `addressId` mal armada |
| 404 | — | `addressId` no es una dirección activa del comprador |
| 409 | `CART_UNAVAILABLE` | Alguna línea no se puede comprar. Trae `quote` |
| 409 | `CART_CHANGED` | El total no coincide con `expectedTotal`. Trae `quote` para mostrar los precios nuevos |
| 409 | `PICKUP_NOT_AVAILABLE` | La sucursal elegida ya no arma el pedido. Trae `quote` |
| 409 | `PROFILE_INCOMPLETE` | Falta nombre o teléfono en el perfil |
| 409 | `ADDRESS_INCOMPLETE` | Falta calle, número, ciudad, provincia o código postal |
| 409 | `TOO_MANY_PENDING_ORDERS` | Ya tiene **3** pedidos sin pagar |
| 409 | `CHECKOUT_KEY_IN_USE` | La `checkoutKey` es de otro comprador |
| 409 | `PAYMENT_UNAVAILABLE` | La tienda no tiene Mercado Pago conectado y vigente |
| 409 | `INSUFFICIENT_STOCK` | Otra compra se llevó lo último |
| 502 | `MERCADOPAGO_UNAVAILABLE` / `MERCADOPAGO_REJECTED` | MP no creó el cobro. No queda pedido ni reserva; se puede reintentar con la misma `checkoutKey` |

### 2.6 Mis pedidos (con token)

Base: `/me/orders`. Un pedido inexistente, de otro comprador o que sea una venta del local da 404.

#### `GET /me/orders?page=0&size=10`

`size` de 1 a 50. Pedidos hechos en la tienda, los más nuevos primero (no incluye ventas del local a la misma ficha).

```json
{
  "id": 57, "orderNumber": "...", "createdAt": "...",
  "status": "AWAITING_PAYMENT", "deliveryType": "SHIPPING",
  "units": 3, "total": 70000, "coverImageUrl": "https://..."
}
```

`units` cuenta unidades sueltas y dentro de promos; `coverImageUrl` es la foto de la primera línea o `null`.

#### `GET /me/orders/{id}`

`StoreOrderResponse`: con los precios **cobrados** (no los actuales) y sin pagos, saldo, notas ni SKU.

```json
{
  "id": 57, "orderNumber": "...", "createdAt": "...",
  "status": "AWAITING_PAYMENT", "cancellable": true, "cancelledAt": null,
  "deliveryType": "SHIPPING", "fulfillment": "SINGLE_BRANCH",
  "pickupBranch": null,
  "shippingAddress": {
    "street": "...", "number": "...", "apartment": null, "floor": null,
    "city": "...", "state": "...", "postalCode": "...", "country": "...", "reference": null
  },
  "items": [
    { "productId": 4, "productVariantId": 11, "productName": "Buzo",
      "attributes": [ { "name": "Talle", "value": "M", "swatch": null } ],
      "quantity": 1, "unitPrice": 25000, "lineTotal": 25000, "imageUrl": "https://..." }
  ],
  "promos": [
    { "promotionId": 2, "name": "2 buzos", "quantity": 1, "unitPrice": 45000, "lineTotal": 45000,
      "components": [
        { "productId": 4, "productVariantId": 11, "productName": "Buzo",
          "attributes": [ ... ], "quantity": 1, "imageUrl": "https://..." }
      ] }
  ],
  "subtotal": 70000, "shippingCost": 0, "total": 70000,
  "paymentUrl": "https://...", "paymentExpiresAt": "..."
}
```

- `pickupBranch` solo en retiro; `shippingAddress` solo en envío, como quedó al comprar.
- `components[].quantity`: unidades por cada promo.
- `paymentUrl`: para retomar el pago; `null` si ya no espera el pago o venció la reserva. `paymentExpiresAt` es `null` en pedidos anteriores al cobro con Mercado Pago.

`status` (`StoreOrderStatus`), agrupado para que los estados internos del ERP no lleguen al sitio:

| Tienda | Estados del ERP |
|---|---|
| `AWAITING_PAYMENT` | `PENDING_PAYMENT` |
| `PREPARING` | `TO_ASSIGN`, `TO_PREPARE`, y `CONFIRMED` con envío |
| `READY_FOR_PICKUP` | `CONFIRMED` con retiro |
| `SHIPPED` | `SHIPPED` |
| `CANCELLED` | `CANCELLED` |

#### `POST /me/orders/{id}/cancel`

Solo mientras espera el pago. Devuelve el stock reservado y responde el pedido actualizado (`StoreOrderResponse`). Un pedido pagado o ya cancelado: **409 `ORDER_NOT_CANCELLABLE`**.

---

## 3. Flujo de pago

1. El sitio cotiza (`/cart/quote`) y muestra el total.
2. El comprador confirma: `POST /me/checkout` con una `checkoutKey` nueva y el `expectedTotal`. Si responde 409 con `quote`, el sitio muestra los cambios y el comprador vuelve a confirmar.
3. El sitio redirige a `paymentUrl` (Checkout Pro de Mercado Pago).
4. Al terminar (aprobado, pendiente o rechazado), Mercado Pago vuelve a **`https://<dominio>/pedidos/{orderId}`**. La vuelta automática (`auto_return` solo con pagos aprobados) funciona solo con https; en desarrollo el comprador vuelve con el botón de MP. En desarrollo el link usa `STORE_LINK_SCHEME=http` y `STORE_LINK_PORT=3000`.
5. En paralelo, Mercado Pago avisa al webhook (`POST /api/v1/mercadopago/webhook`, lo llama MP y está protegido con firma). Con un pago aprobado que coincide en moneda y total, el pedido pasa a pagado (en la tienda, `PREPARING` o `READY_FOR_PICKUP`). Si el pedido ya estaba cancelado o pagado, el pago se devuelve entero.
6. La página `/pedidos/{id}` del sitio consulta `GET /me/orders/{id}`. Puede seguir en `AWAITING_PAYMENT` unos segundos hasta que llega el webhook: el sitio tiene que tolerarlo (por ejemplo, volviendo a consultar).
7. Un pago rechazado no cambia nada: el comprador puede reintentar con `paymentUrl` mientras dure la reserva.
8. Si nadie paga, cada 5 minutos se cancelan los pedidos cuyo link venció hace más de 10 minutos (margen para pagos en curso) y se libera el stock.

---

## 4. Panel de la tienda

Endpoints del ERP: `Authorization: Bearer <token del ERP>` (login en `POST /api/v1/auth/login`) y permiso **`ADMINISTRAR_TIENDA`**. No usan `X-Store-Domain`: la empresa sale del usuario. Sin el permiso: 403.

### 4.1 Configuración: `/api/v1/companies/me/store`

`GET` → `StoreSettingsResponse`:

```json
{ "storeDomain": "elyuyei.test", "storeEnabled": true, "priceAdjustmentPercent": 10.00, "roundingStep": 100 }
```

`storeDomain` y `storeEnabled` son de solo lectura (los carga el operador de la plataforma).

`PATCH` con `{ "priceAdjustmentPercent": 10, "roundingStep": 100 }` → `StoreSettingsResponse`.

- `priceAdjustmentPercent`: obligatorio, -90 a 500, hasta 2 decimales. Ajuste sobre el precio del ERP.
- `roundingStep`: obligatorio, 1 a 1000. Múltiplo al que se redondea **hacia arriba**.

### 4.2 Publicar productos: `PATCH /api/v1/products/{id}/publication`

Request `{ "publishedOnline": true }` → `ProductResponse` del ERP (incluye `publishedOnline`).

- Publicar exige al menos una foto, propia o de alguna variante: si no, **409 `PRODUCT_IMAGE_REQUIRED`**.
- Despublicar siempre se puede.
- Un producto inactivo puede quedar publicado; la tienda lo muestra recién cuando se reactiva.
- Es un endpoint propio y no un campo de la edición del producto, para que el panel no pise cambios del ERP.

### 4.3 Fotos: `/api/v1/products/{productId}/images`

JPG, PNG o WebP; hasta 2 MB; hasta 3 fotos por producto o por variante. La subida es directa al almacenamiento, en tres pasos:

1. `POST /upload-url` con `{ "variantId": null, "contentType": "image/webp", "sizeBytes": 123456 }`. Sin `variantId`, la foto es del producto. Responde:

   ```json
   { "storageKey": "...", "uploadUrl": "https://...", "contentType": "image/webp", "expiresAt": "..." }
   ```

   La URL firmada dura 10 minutos. Tipo, tamaño o cantidad no permitidos: **422**.
2. El panel sube el archivo con `PUT uploadUrl`, con los headers `Content-Type` y `Content-Length` declarados.
3. `POST` (sin sufijo) con `{ "storageKey": "...", "variantId": null }` → **201** `ProductImageResponse`. Valida el archivo guardado (tamaño y formato real); si no se subió o no es válido: **422**. Queda al final del orden.

Resto:

| Endpoint | Request | Respuesta |
|---|---|---|
| `GET` | — | Lista de `ProductImageResponse` del producto y sus variantes, por orden |
| `PATCH /order` | `{ "variantId": null, "imageIds": [3, 1, 2] }` | Lista reordenada. Lleva **todas** las fotos del producto (o de esa variante); la primera es la portada |
| `DELETE /{imageId}` | — | `{ "productUnpublished": true }` si era la última foto de un producto publicado y se lo sacó de la tienda |

`ProductImageResponse`:

```json
{ "id": 3, "variantId": null, "url": "https://...", "sortOrder": 0, "visibleInStore": true }
```

`visibleInStore = false`: la foto es de una variante inactiva y la tienda no la muestra (el panel lo avisa).

### 4.4 Sucursales que venden por la web: `PUT /api/v1/branches/store-priority`

Request `{ "branchIds": [1, 3] }`: lista **completa y ordenada**. La tienda intenta armar cada pedido en ese orden; las sucursales que no están dejan de participar.

Responde las sucursales de la empresa (`BranchResponse` del ERP, con `storePriority`; `null` = no vende por la web). Sucursal inexistente: 404; inactiva: **409 `BRANCH_INACTIVE`**.

### 4.5 Mercado Pago: `/api/v1/companies/me/mercadopago`

`GET` → `MercadoPagoConnectionResponse` (nunca devuelve tokens; los campos `null` se omiten):

```json
{
  "available": true, "connected": true, "reconnectRequired": false,
  "mpUserId": 3839187533, "liveMode": false,
  "connectedAt": "...", "expiresAt": "..."
}
```

- `available = false`: la plataforma no tiene Mercado Pago configurado; el botón "Conectar" no tiene sentido.
- `reconnectRequired = true`: el panel muestra el cartel para reconectar; mientras tanto la tienda no cobra (el checkout da `PAYMENT_UNAVAILABLE`).
- Sin conexión, solo vienen `available` y `connected: false`.

`GET /connect` → `{ "authorizationUrl": "https://auth.mercadopago..." }`. Vale 10 minutos. El panel la abre en el navegador (devuelve la URL en vez de redirigir porque el panel manda el token en un header).

`DELETE` → **204**. Borra los tokens. La autorización se revoca desde la cuenta de Mercado Pago.

**Callback** (`GET /api/v1/mercadopago/oauth/callback`): lo abre Mercado Pago en el navegador del admin, sin token del ERP. Hoy responde una **página HTML** con el resultado ("Cuenta conectada", cancelado, cuenta ya usada por otra empresa, link vencido, MP deshabilitado). El panel no lo llama.

---

## 5. Pendientes y diferencias conocidas

- **IP real del comprador detrás del BFF (sin implementar, a decidir antes de habilitar una tienda):** los límites por IP del registro, el login, el reenvío y la recuperación usan `getRemoteAddr`. Con el BFF, todos los pedidos llegan desde la IP del servidor de Next, así que el límite por IP frenaría a **todos** los compradores a la vez. Lo que se propuso en `etapa-22b-cuentas.md`: que el sitio mande la IP del comprador en un header junto con una clave compartida (`STORE_BFF_SECRET`), y que el backend use ese header solo si la clave coincide. Hoy el código no lo tiene.
- **Envío**: `ToCoordinateShippingProvider` cobra 0 ("a coordinar"). Antes de habilitar una tienda hay que reemplazarlo por un proveedor real; cuando pase, `shippingCost` deja de ser 0 y puede cambiar el contrato del checkout (por ejemplo, para cotizar el envío antes de comprar).
- **Callback de OAuth**: responde HTML. El código dice que, cuando exista el panel de la tienda, va a pasar a redirigir al panel con el resultado.
- **Estados de "Mis pedidos"**: no hay estado de entregado ni retirado; un retiro pagado queda en `READY_FOR_PICKUP`. El botón de arrepentimiento (con fecha de entregado) está planteado pero sin decidir.
- **Sandbox de Mercado Pago**: el pago con la preferencia creada por el token OAuth del vendedor falla en Checkout Pro. La causa probable es que la app no es de modelo Marketplace; no se espera que cambie el contrato.
