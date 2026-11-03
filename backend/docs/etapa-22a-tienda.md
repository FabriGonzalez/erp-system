# Etapa 22A — Fundamentos de la tienda (backend)

Plan detallado de la primera parte de la etapa 22 (plan general en `docs/plan-proximas-etapas.md`, sección "Etapa 22"). Rama: `feature/store-22a`, desde `feature/production-ready`. Alcance: **solo backend**; el frontend del ERP para la tienda se planea aparte.

Estado al 2026-11-03: pasos 1 y 2a hechos; falta 2b (publicar) y 3 (catálogo público).

## Decisiones

1. **Dominio y habilitación los carga el operador, no el ERP.** Cada tienda se da de alta cuando se hace la tienda de una empresa, con `storeDomain` y `storeEnabled` seteados por nosotros (endpoint de plataforma o procedimiento documentado, a definir en el plan de 22A). El ERP no puede cambiarlos: un cliente no puede reclamar un dominio ajeno. El ERP solo los ve en lectura.
2. **Almacenamiento de imágenes: RustFS** en docker-compose para desarrollo (MinIO dejó de publicar imágenes de Docker; RustFS es un servidor S3 real que valida firmas y políticas como R2/B2), con el SDK de AWS (S3). Bucket `erp-images` de **lectura pública**, creado por un contenedor de `aws-cli`. Todo por configuración (endpoint, bucket, credenciales por variable de entorno). La elección para producción queda para antes de habilitar la tienda (ver 22B).
3. **Redondeo del precio web:** **hacia arriba** al múltiplo de `Company.storeRoundingStep` (default 10, entre 1 y 1000) para poder cambiarlo por empresa.
4. **Límites de imágenes:** máximo **3 fotos por producto** y **3 por variante**; máximo **2 MB por archivo**; formatos JPG, PNG y WebP. Se rechaza lo que no cumple (422 con código propio); no se redimensiona en el backend en esta etapa.
5. **Promos en la tienda:** `GET /store/promotions` en modo solo lectura, con precio web. El carrito y el checkout quedan para 22C.
6. **Permiso nuevo `ADMINISTRAR_TIENDA`** (decisión del 2026-11-03): cubre ver la configuración de la tienda y cambiar el porcentaje y el redondeo (no `ADMINISTRAR_PRECIOS`). La migración se lo da al rol de sistema de las empresas existentes.
7. **Alta del dominio:** endpoint en `/provisioning` (`PLATFORM_ADMIN`), en el paso 3.
8. **Frontends separados (decisión del usuario, 2026-11-03):** la tienda web es un proyecto aparte con su propio **panel admin** (fotos, publicar, configuración de la tienda). El frontend del ERP **no se toca** para la tienda. Lo único en común es el backend: un cambio de stock, precio o producto se ve en los dos. Los endpoints de gestión de esta etapa (`/companies/me/store`, imágenes, publicar) los consume ese panel.
   - **Login del panel:** los mismos usuarios del ERP (`/auth/login`, mismo token); lo que pueden hacer depende de sus permisos (`ADMINISTRAR_TIENDA`, `ADMINISTRAR_PRODUCTOS`). El dominio del panel va en `CORS_ALLOWED_ORIGINS`.
   - **Única excepción en el ERP:** los pedidos web y la marca de cliente "Web" se ven en los dos frontends (22B y 22D). El ERP ve todo; el panel de la tienda, solo los pedidos web.

## Pasos

1. Configuración de la tienda y precio web: `V6`, campos en `Company` y `Product`, permiso, `GET/PATCH /companies/me/store`, función única de precio web. **Hecho el 2026-11-03.**
2. Imágenes y publicar, en dos partes:
   - **2a. Fotos:** RustFS, SDK de S3, `ProductImage`, `GET/POST /products/{id}/images`, `upload-url`, `order`, `DELETE` (despublica si era la última), límites y validación del archivo guardado. **Hecho el 2026-11-03** (probado contra RustFS y sobre una copia de la base de desarrollo).
   - **2b. Publicar:** `PATCH /products/{id}/publication`, 409 `PRODUCT_IMAGE_REQUIRED`, `publishedOnline` en la respuesta de producto.
3. Catálogo público: filtro por dominio, CORS por dominio, cadena de seguridad aparte, endpoints `/store/**`, alta del dominio por provisioning, tests de aislamiento.

## Migración

`V6__tienda.sql` (la próxima libre; V1 a V5 ya existen):
- `companies`: `store_domain` (único, nullable), `store_enabled` (default `false`), `store_price_adjustment_percent` (default 0, puede ser negativo), `store_rounding_step` (default 10).
- `products`: `published_online` (default `false`).
- `product_images`: id, company_id, product_id (nullable), product_variant_id (nullable), storage_key, sort_order, created_at. Un CHECK exige exactamente uno de los dos padres.

Las columnas nuevas son aditivas y con default, así la app vieja no se rompe. Se prueba primero en el staging (Render + Neon) según el plan general.

## 1. Tienda por dominio

- Filtro para `/api/v1/store/**`: resuelve la empresa por el header `Origin`, o por `X-Store-Domain` para la tienda renderizada en servidor. Lo deja en un contexto propio (no en `SecurityUtils`).
- Empresa inexistente, con `storeEnabled = false` o suspendida → **404** (no 403, para no revelar que existe).
- CORS: `/store/**` solo admite los dominios registrados. El resto de la API deja de aceptar `*` y pasa a usar `CORS_ALLOWED_ORIGINS`, que ya existe en Render. **Riesgo:** si el origen de la web del ERP no está en esa variable, el panel deja de funcionar; revisarlo antes de desplegar.

## 2. Imágenes

- Entidad `ProductImage` (producto o variante, `sortOrder`, `storageKey`).
- Flujo con URL firmada: el panel de la tienda pide una URL de subida (10 minutos, con tipo y tamaño firmados), sube directo al almacenamiento y luego confirma la imagen. El backend valida al confirmar el archivo guardado: tamaño con `HEAD` y formato por sus primeros bytes (no confía en lo que dice el cliente); lo que no pasa se borra del bucket.
- Endpoints (panel de la tienda, permiso `ADMINISTRAR_TIENDA`): `GET /products/{id}/images`, `POST /products/{id}/images/upload-url`, `POST /products/{id}/images`, `PATCH /products/{id}/images/order`, `DELETE /products/{id}/images/{imageId}`.
- Claves `companies/{empresa}/products/{producto}/{uuid}.{ext}`; el archivo de una foto borrada se elimina después del commit.
- Pendiente antes de habilitar la tienda: regla del bucket que borre archivos subidos y nunca confirmados.
- **Publicar exige al menos una foto**, propia o de cualquiera de sus variantes. Publicar sin ninguna → **409 `PRODUCT_IMAGE_REQUIRED`**.
- Borrar la última foto de un producto publicado lo **despublica** en la misma operación; la respuesta del borrado lo indica.
- Una variante sin fotos muestra las del producto. La portada del listado es la primera foto del producto o, si no tiene, la de la primera variante con foto.

## 3. Producto en la tienda

- `Product.publishedOnline` (default `false`). Es el mismo producto del ERP, no una copia: stock, precio, promos, reportes y movimientos siguen atados a `ProductVariant`.
- Se publica con un endpoint propio (decisión del 2026-11-03): `PATCH /products/{id}/publication` con `{ publishedOnline }`, permiso `ADMINISTRAR_TIENDA`. El alta y la edición de producto del ERP no cambian: la edición reemplaza el producto entero y, si el panel la usara para publicar, podría pisar precios o variantes cambiados en el ERP mientras tanto.

## 4. Precio web

- Una sola función calcula el precio web: `precio ERP × (1 + storePriceAdjustmentPercent / 100)`, redondeado al `storeRoundingStep`. La usan el catálogo público y, en 22C, el checkout. No se guarda.
- Se aplica también a las promos (precio web de la promo).
- Lo cambia `ADMINISTRAR_TIENDA`: `GET /companies/me/store` (lectura) y `PATCH /companies/me/store` (solo `storeRoundingStep` y `storePriceAdjustmentPercent`; dominio y habilitación no están en el PATCH).
- Validación: porcentaje entre -90 y 500 con hasta 2 decimales; paso entre 1 y 1000. Con el redondeo hacia arriba, el precio web siempre es mayor a 0.

## 5. Catálogo público

- `GET /store/info`: nombre de la empresa, dominio, configuración visible para la tienda (sin datos internos).
- `GET /store/categories`: categorías activas con productos publicados.
- `GET /store/products`: paginado, búsqueda, filtro por categoría, orden por precio o nombre. Solo productos activos, publicados, de categorías activas, con precio.
- `GET /store/products/{id}`: variantes, atributos, imágenes y disponibilidad sumada de todas las sucursales activas (cantidad o "sin stock").
- Productos y variantes sin stock **se muestran** como "Sin stock"; el checkout los rechaza (22C).
- `GET /store/promotions`: promos vigentes con precio web (solo lectura).
- Respuestas propias de la tienda: nunca entidades ni DTOs del ERP, sin costos, sin ids internos innecesarios.
- La cadena de seguridad de `/store/**` es pública y aparte de la del ERP. Los endpoints del ERP no cambian de autenticación.

## Lo que no entra en 22A

- Cuentas de comprador, login y mails (22B).
- Carrito, cotización, checkout y Mercado Pago (22C).
- El panel admin y el sitio de la tienda (proyectos aparte). El frontend del ERP no cambia.
- Elección de almacenamiento para producción (se decide antes de habilitar la tienda).

## Criterios de aceptación

- Empresa sin dominio, deshabilitada o suspendida → 404 en `/store/**`.
- Un origen no registrado no recibe CORS en `/store/**`.
- No se puede publicar un producto sin foto (409 `PRODUCT_IMAGE_REQUIRED`).
- Borrar la última foto de un producto publicado lo despublica.
- Más de 3 fotos por producto o variante, archivo mayor a 2 MB o formato no permitido → rechazado.
- El catálogo público no muestra productos despublicados, inactivos, de categorías inactivas ni sin precio.
- La disponibilidad sumada coincide con el stock real de todas las sucursales activas.
- El precio web sale de la función única, con redondeo a $10 y el porcentaje de la empresa; cambiar el porcentaje no altera pedidos anteriores (eso se verifica en 22C).
- Tests de aislamiento: una empresa no ve productos, imágenes ni promos de otra por `/store/**`.
- Ninguna respuesta de `/store/**` incluye datos de otros clientes ni costos.

## Validación

- Backend: `./mvnw test` (la suite necesita Docker para Testcontainers; si no está, se saltea el test de contexto).
- Probar contra la copia de QA (puerto 8082, base `erp_qa`) con RustFS levantado por docker-compose.
- Migración `V6` probada sobre una copia de la base de desarrollo antes de subirla a staging.
- Frontend: no aplica en esta etapa.

## Preguntas abiertas para más adelante (no bloquean 22A)

- Oracle Object Storage o R2/B2 para producción (decidir antes de habilitar la tienda).
- Quién y cómo da de alta un dominio de tienda (endpoint de plataforma o procedimiento).
- Mails y dominio propio de la empresa para la tienda (etapa 26).
