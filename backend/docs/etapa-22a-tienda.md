# Etapa 22A — Fundamentos de la tienda (backend)

Plan detallado de la primera parte de la etapa 22 (plan general en `docs/plan-proximas-etapas.md`, sección "Etapa 22"). Rama: `feature/store-22a`, desde `feature/production-ready`. Alcance: **solo backend**; el frontend del ERP para la tienda se planea aparte.

Estado al 2026-11-04: **etapa 22A terminada** (pasos 1, 2 y 3 completos, incluidas las promos de 3c-2).

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
   - **2b. Publicar:** `PATCH /products/{id}/publication`, 409 `PRODUCT_IMAGE_REQUIRED`, `publishedOnline` en la respuesta de producto. Un producto inactivo puede quedar publicado (la tienda lo muestra recién al reactivarlo). **Hecho el 2026-11-03.**
3. Catálogo público, en tres partes (plan del 2026-11-03):
   - **3a. Tienda por dominio:** filtro de `/store/**` (empresa por `X-Store-Domain` u `Origin`, normalizado; inexistente, deshabilitada o empresa no activa → 404) y contexto de tienda propio; cadena de seguridad aparte y pública, con el `JwtAuthFilter` excluido de `/store/**` (hoy, como `@Component`, corre en todas las rutas); CORS de `/store/**` solo para dominios de tiendas habilitadas; `PATCH /provisioning/companies/{id}/store` (`storeDomain`, `storeEnabled`; formato válido, 409 `STORE_DOMAIN_ALREADY_EXISTS`, no se habilita sin dominio); `GET /store/info`; tests de normalización e integración (404, CORS, sin token de empleado). **Hecho el 2026-11-03.** El `JwtAuthFilter` quedó con su registro de servlet desactivado (`FilterRegistrationBean`) en lugar de excluir rutas: corre solo dentro de la cadena del ERP.
   - **3b. Catálogo:** `GET /store/categories`, `GET /store/products` (paginado, búsqueda, categoría, orden por precio o nombre), `GET /store/products/{id}`. Visible = activo, publicado, categoría activa y al menos una variante activa; solo variantes activas; stock sumado de sucursales activas. **Disponibilidad sin cantidad exacta (decisión del usuario, 2026-11-03, opción B):** cada variante trae `AVAILABLE`, `LOW_STOCK` (3 o menos, umbral fijo en el código) u `OUT_OF_STOCK`; el listado, `AVAILABLE` si alguna variante tiene stock y si no `OUT_OF_STOCK`. Así no se expone el inventario; la cantidad real la valida el checkout (22C). **Hecho el 2026-11-03** (test de integración contra Postgres: `StoreCatalogTests`). Reglas de fotos resueltas en el backend (variante sin fotos → las del producto; portada). Ordenar por precio web = ordenar por precio ERP mínimo (mismo porcentaje y redondeo hacia arriba para todos: el orden no cambia), así la base pagina sin calcular precios. DTOs y repositorio propios de la tienda.
   - **3c. Promos y regla de variantes activas:** `GET /store/promotions` (vigentes hoy, precio web). **Una promo con algún producto no visible no se muestra** (decisión del usuario). Publicar y despublicar cuentan solo fotos del producto y de **variantes activas**; si la edición de producto del ERP desactiva una variante y el producto se queda sin fotos visibles, se despublica (decisión del usuario, 2026-11-03). Motivo: las variantes no se borran, se desactivan, y hoy un producto cuyas únicas fotos son de variantes inactivas queda publicado sin nada que mostrar.
   - **SKU de variante no editable (decisión del usuario, 2026-11-03, opción A):** el SKU es la identidad de la variante (la edición y la importación la reconocen por SKU). En el formulario del ERP el SKU de una variante guardada es de solo lectura; para "cambiarlo" se quita la variante y se agrega otra. El backend no cambia. Commit aparte, fuera de la tienda.
   - **Dominio por coincidencia exacta** (decisión del usuario): el backend acepta solo el dominio registrado; `www` se resuelve con una redirección en el hosting (ver "Antes de habilitar una tienda").
   - **CORS del ERP sin cambios en 22A** (decisión del usuario): en Render ya se usa `CORS_ALLOWED_ORIGINS`; quitar el `*` por defecto queda para la etapa 30 (lanzamiento). El dominio del panel de la tienda se suma a esa variable cuando exista.

## Plan del paso 3c (2026-11-04)

Dos commits, en este orden: primero la regla de variantes activas (cambia lo que ya existe) y después las promos (solo agrega).

### 3c-1. Fotos visibles = producto + variantes activas (hecho el 2026-11-04)

Hoy `findAllOfProduct` cuenta las fotos de todas las variantes, activas o no. Se cambia a contar solo las visibles, la misma regla que ya usa el catálogo (`findVisibleOfProducts`).

- `ProductImageRepository`: `existsVisibleOfProduct(productId)` (fotos propias o de variantes activas). `findAllOfProduct` queda para el listado del panel, que sigue mostrando todas.
- **Publicar** (`ProductServiceImpl.updatePublication`): exige una foto visible; si no hay, 409 `PRODUCT_IMAGE_REQUIRED` como hoy.
- **Borrar foto** (`ProductImageServiceImpl.delete`): despublica si no queda ninguna visible (antes: ninguna en total).
- **Editar producto** (`ProductServiceImpl.update`, que también usa la importación de Excel): después de `updateVariants`, si estaba publicado y no le queda foto visible, se despublica en la misma transacción. La respuesta ya trae `publishedOnline`, así el ERP y el panel lo ven sin campo nuevo.
- Reactivar una variante **no** vuelve a publicar: publicar es siempre una acción del panel.
- Desactivar el producto entero no cambia nada (decisión de 2b: queda publicado y la tienda lo oculta).
- **Aviso de fotos en variantes inactivas (decisión del usuario, 2026-11-04):** se pueden seguir subiendo, y cada foto de `GET/POST /products/{id}/images` trae `visibleInStore` (`false` si es de una variante inactiva). Con eso el panel muestra "esta variante está inactiva: la foto no se ve en la tienda". No se rechaza nada.
- Tests: `ProductPublicationTest` (publicar con fotos solo en variantes inactivas → 409), `ProductImageServiceImplTest` (borrar la última foto visible despublica aunque queden fotos de variantes inactivas; `visibleInStore` en `false` para una variante inactiva) y un test de la edición que desactiva la única variante con fotos.

### 3c-2. `GET /store/promotions` (hecho el 2026-11-04)

- **Cuáles:** de la empresa de la tienda, activas y vigentes hoy (`BusinessDate.today()`, hora de Argentina, igual que el ERP), y **todos** sus productos visibles con la regla del catálogo (activo, publicado, categoría activa, alguna variante activa). Una sola consulta con `NOT EXISTS` sobre los ítems con producto no visible.
- **Respuesta** (`StorePromotionResponse`, propia de la tienda): `id`, `name`, `description`, `webPrice` (con `StorePrices.webPrice`, la función única), `regularWebPrice`, `savings`, `availability`, `endDate` (para mostrar "hasta el…") e `items`: `productId`, `productName`, `quantity` y la portada del producto (misma regla de fotos que el catálogo). Sin precio ERP, sin costos, sin `startDate` ni estado.
- **Sin paginar (decisión del usuario, 2026-11-04):** lista completa; una empresa tiene pocas promos vigentes a la vez.
- **Ahorro (decisión del usuario, 2026-11-04):** `regularWebPrice` = suma, por ítem, del precio web de la variante activa **más barata** del producto × cantidad; `savings` = `regularWebPrice − webPrice`. Al tomar la más barata, el ahorro es el **mínimo** real: con cualquier otra variante el comprador ahorra más, así que "ahorrás al menos $X" nunca miente. Si la promo no es más barata que comprar por separado (`savings ≤ 0`), los dos campos van en `null` y la tienda no muestra ahorro.
- **Disponibilidad (decisión del usuario, 2026-11-04):** `AVAILABLE` si cada producto tiene, sumando sus variantes activas en sucursales activas, al menos la cantidad que pide la promo; si no, `OUT_OF_STOCK`. Se suma entre variantes porque las unidades de una promo pueden ser de variantes distintas. Sin cantidades exactas; el checkout valida (22C).
- **Orden:** las que vencen antes primero, después por nombre.
- **Repositorio y servicio:** consultas en `StoreCatalogRepository` (sigue siendo solo lectura): las promos visibles con sus ítems, y el precio mínimo de las variantes activas por producto. Método en `StoreCatalogService`; se reusan la carga de portadas y la de stock (`findActiveVariantStock`) del catálogo.
- **Tests:** unitario del servicio (precio web, ahorro, ahorro en `null` si no conviene, disponibilidad) e integración en `StoreCatalogTests`: promo vigente con todo visible aparece; vencida, programada, desactivada o con un producto despublicado / de categoría inactiva no aparece; una empresa no ve las promos de otra.

### Archivos estimados (unos 13)

- 3c-1: `ProductImageRepository`, `ProductServiceImpl`, `ProductImageServiceImpl`, `ProductImageResponse` y sus tests (`ProductPublicationTest`, `ProductImageServiceImplTest`, test de edición de producto).
- 3c-2: `StoreCatalogRepository`, `StoreCatalogService`, `StoreCatalogServiceImpl`, `StorePromotionResponse` (nuevo), `StoreController`, `StoreCatalogServiceImplTest`, `StoreCatalogTests`.
- Este documento (estado y criterios).

## Para 22B: sesión del comprador (anotado el 2026-11-03)

- **Dirección elegida (a confirmar al planear 22B):** el sitio de la tienda con servidor propio (Next.js, Nuxt o Astro: patrón "BFF"). El navegador guarda solo una cookie `HttpOnly` del dominio de la tienda; el token del comprador lo guarda el servidor de la tienda y lo manda a la API en `Authorization`, con `X-Store-Domain`. Un XSS en la tienda no puede robar la sesión.
- **Por qué no cookies directo desde la API:** la API está en otro dominio, así que sería una cookie de terceros (Safari las bloquea por defecto, Firefox y Brave las restringen); para que fuera propia, la API tendría que atender en un subdominio de cada tienda (DNS y certificado por empresa).
- **La API no cambia:** sigue con token en el header, sin cookies (`setAllowCredentials(false)` en el CORS de la tienda). No es un segundo backend: el servidor de la tienda no tiene base ni reglas de negocio, solo arma páginas y guarda la sesión.
- **Alternativa si la tienda fuera solo estática (SPA):** token de acceso corto en memoria (no en `localStorage`) y token de renovación (`/store/auth/refresh`).

## Antes de habilitar una tienda (checklist)

- [ ] Verificar que el dominio sea de la empresa (que lo controla en su DNS) antes de cargarlo por provisioning: el backend confía en el registro del operador.
- [ ] Configurar en el hosting de la tienda la redirección de `www.dominio` al dominio registrado (o al revés, y registrar ese): el backend compara el dominio exacto.
- [ ] Sumar el dominio del panel de la tienda a `CORS_ALLOWED_ORIGINS`.
- [ ] Almacenamiento de fotos de producción (R2 o B2) con sus variables `STORAGE_*`, bucket de lectura pública y regla que borre archivos subidos y nunca confirmados.
- [ ] La app con las etiquetas de los estados nuevos de pedido publicada (22C/22D) antes de que entren pedidos web.

## Migración

`V6__tienda.sql` (la próxima libre; V1 a V5 ya existen):
- `companies`: `store_domain` (único, nullable), `store_enabled` (default `false`), `store_price_adjustment_percent` (default 0, puede ser negativo), `store_rounding_step` (default 10).
- `products`: `published_online` (default `false`).
- `product_images`: id, company_id, product_id (nullable), product_variant_id (nullable), storage_key, sort_order, created_at. Un CHECK exige exactamente uno de los dos padres.

Las columnas nuevas son aditivas y con default, así la app vieja no se rompe. Se prueba primero en el staging (Render + Neon) según el plan general.

## 1. Tienda por dominio

- Filtro para `/api/v1/store/**`: resuelve la empresa por el header `Origin`, o por `X-Store-Domain` para la tienda renderizada en servidor. Lo deja en un contexto propio (no en `SecurityUtils`).
- Empresa inexistente, con `storeEnabled = false` o suspendida → **404** (no 403, para no revelar que existe).
- CORS: `/store/**` solo admite los dominios registrados. El CORS del resto de la API no cambia en 22A (ver paso 3).

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
- Mails y dominio propio de la empresa para la tienda (etapa 30, lanzamiento).
