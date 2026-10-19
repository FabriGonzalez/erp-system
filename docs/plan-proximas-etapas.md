# Plan de las etapas que quedan

Estado al 2026-10-19, rama `feature/error-handling`. Para retomar: pasarle este archivo a Claude y
elegir la etapa.

## Cómo se trabaja (vale para todas las etapas)

- Una rama por etapa, a partir de la anterior. Commit solo cuando lo pida el usuario.
- Backend: `ddl-auto: update` (no borra columnas). Validar en una instancia aislada: puerto **8082**
  (el 8081 es Metro/Expo), base temporal `erp_qa` en el contenedor `erp-postgres`, borrarla al terminar.
  Compilar/testear reinicia el backend del usuario en IntelliJ (devtools sobre `target/classes`):
  avisar y nunca matar ese proceso.
- Frontend: `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`.
- Estado del servidor → TanStack Query (`src/hooks/use-*-queries.ts`); estado del cliente → Zustand.
  No mezclar los dos esquemas para la misma entidad.
- No navegar entre stacks de Expo Router: reutilizar componentes o re-exportar pantallas.

## Hecho

- **Etapas 1-4 — Clientes** (`feature/customers-api`): API real, TanStack Query, integración con pedidos.
- **Etapa 5 — Dirección de envío persistida** (`feature/shipping-address`, 1447c90):
  `OrderRequest.shippingAddressId`, snapshot en `Shipment`, `OrderResponse.shipment`.
- **Etapa 6 — Cuenta corriente y pagos reales** (`feature/customer-payments`, e5c7337 y aa4f843):
  resumen, pendientes, movimientos, deudores, registrar y anular pagos. Se borraron
  `customer-account-store`, `utils/customer-account.ts` y `data/mock-orders.ts`.
- **Etapa 7 — Permisos reales** (`feature/real-permissions`, 556a420 y 980359b): `Permission` = enum
  del backend, `GET /api/v1/auth/me` con refresco al hidratar y al volver al frente, acciones y
  accesos ocultos según el permiso real.
- **Etapa 8 — Transferencias** (`feature/stock-transfers`, cf53090 y f1336af; 604c0df aparte: URL del
  backend deducida del host).
- **Etapa 9 — Usuarios y roles** (`feature/users-roles`, 0187b05 y 55ec5a9): ABM de usuarios y roles,
  `GET /roles/permissions`, el admin elige la contraseña al crear/resetear, las cuentas creadas por
  el admin no cambian su contraseña (`passwordManagedByAdmin`), código de rol como texto libre.
- **Etapa 10 — Movimientos de stock** (`feature/stock-movements`, c760d7d y b3a8b42): usuario en cada
  movimiento, alta/edición de producto registradas como ajuste, `GET /inventory/movements` paginado
  con filtros, detalle de stock con historial; Inventario muestra solo la sucursal activa.
- **Etapa 11 — Errores en español** (`feature/error-handling`, 12f7868 y 5cb7c5b): `code` en todos los
  errores de negocio, handlers para los errores de Spring MVC (400/404/405/415 en vez de 500),
  catch-all que loguea sin exponer el detalle; en el frontend `api-error.ts` (`ApiError`,
  `toApiError`, `NETWORK_ERROR`) y los 15 servicios migrados a un solo patrón.

---

## Mapa de integración (relevado el 2026-10-14; transferencias, usuarios, roles y movimientos ya conectados en las etapas 8 a 10)

| Módulo | Backend | Frontend |
|---|---|---|
| Auth, sucursales, categorías, productos, atributos, stock, pedidos/envíos | Completo | Conectado (Zustand) |
| Clientes, cuenta corriente, pagos | Completo | Conectado (TanStack) |
| **Transferencias** `/api/v1/inventory/transfers` | Completo (GET, GET `/{id}`, POST, PATCH `/{id}/cancel`) | **Nada** |
| **Usuarios** `/api/v1/users` (CRUD, activar/desactivar, `password-reset`) | Completo | Solo el listado dentro de `BranchUsersAssignmentModal`; el ítem "Usuarios" de `more.tsx` no hace nada |
| **Roles** `/api/v1/roles` | Completo (falta un endpoint que liste los permisos) | **Nada** |
| **Movimientos de stock** `/api/v1/inventory/movements` | Solo lectura, sin paginar, la respuesta solo trae `stockId` | **Nada** |
| Dashboard / reportes | **Nada** (solo existe el permiso `VER_REPORTES`) | Ítem "Analytics – Próximamente" en `more.tsx` |

---

## Etapa 7 — Permisos reales

Va primero: rompe la UI para cualquier rol que no se llame "Administrador" y las etapas 8 y 9 dependen
de ella.

**Problema.**
- `src/types/auth.ts:10-28`: el tipo `Permission` usa nombres inventados (`PRODUCTS_CREATE`,
  `ORDERS_UPDATE`, ...) que no existen en el backend. `auth-store.ts:58` lo tapa con un cast y
  `utils/permissions.ts:hasPermission` recibe `string`.
- Checks que nunca coinciden con un permiso real (solo pasan por el nombre del rol):
  `(tabs)/products/index.tsx:67-72`, `(tabs)/shipments/[id]/index.tsx:65`, `operations/[id].tsx:59`.
  Un empleado con `CREAR_PEDIDOS`/`PREPARAR_PEDIDOS` no puede despachar ni cancelar desde la app.
- `(tabs)/more.tsx:22`: la sección Administración se muestra solo si el rol se llama "Administrador".
- Sin chequeo: ajuste de stock (`inventory/index.tsx`, `StockAdjustModal`), categorías, atributos,
  sucursales.

**Plan.**
- `Permission` = los 17 valores de `backend/.../roles/entity/Permission.java`; quitar el cast y el `string`.
- Reemplazar los checks según el `@PreAuthorize` real: productos y atributos → `ADMINISTRAR_PRODUCTOS`;
  despachar → `PREPARAR_PEDIDOS`; editar/cancelar pedido → `CREAR_PEDIDOS`; categorías →
  `ADMINISTRAR_CATEGORIAS`; sucursales → `ADMINISTRAR_SUCURSALES`; ajuste → `AJUSTAR_STOCK`.
- Ítems de Administración en `more.tsx` según el permiso de cada uno, no por el nombre del rol.
- Borrar `src/data/mock-user.ts` (sin uso y con los nombres viejos).

**Decisión a tomar.** Los permisos y el rol se guardan al loguearse y nunca se refrescan (`hydrate()`
solo lee AsyncStorage). Para refrescarlos hace falta `GET /api/v1/auth/me` en el backend, que no existe.
Recomendado agregarlo.

**Pruebas.** Con un usuario **no administrador**: despachar, cancelar, editar, ver solo los ítems de
Administración que le corresponden; el administrador sigue viendo todo.

---

## Etapa 8 — Transferencias entre sucursales

Plan detallado el 2026-10-15, relevado contra el código.

**Arranque.** Commitear la etapa 7 (backend y frontend en commits separados, como la 6) y crear
`feature/stock-transfers` desde `feature/real-permissions`.

**Lo que ya existe en el backend** (`modules/transfers`, `/api/v1/inventory/transfers`):
- `GET` y `GET /{id}` → `StockTransferResponse{id, originBranchId/Name, destinationBranchId/Name,
  status: CONFIRMED|CANCELLED, createdById, createdByUsername, confirmedAt, items, createdAt, updatedAt}`;
  ítem: `{id, productId, productName, productVariantId, productVariantSku, quantity}`.
- `POST {originBranchId, destinationBranchId, items: [{productVariantId, quantity ≥ 1}]}` → 201, nace
  `CONFIRMED` y mueve el stock en la misma transacción (crea el stock de destino si no existe).
- `PATCH /{id}/cancel` → 200; revierte y exige que el **destino** todavía tenga la cantidad.
- Permisos: lectura `TRANSFERIR_STOCK` o `CONSULTAR_STOCK`; escritura `TRANSFERIR_STOCK`.
  `GET /products` y `GET /branches` no piden permiso: cualquier usuario puede armar el alta.
- No valida que el usuario esté asignado a la sucursal de origen ni que las sucursales estén activas.
- Sin tests de transferencias.

**Errores que puede devolver hoy** (ninguno con `code` propio de transferencias):
| Caso | Excepción | Status / code |
|---|---|---|
| Origen = destino, variante repetida, anular una ya anulada | `InvalidStockTransferException` | 400, sin code |
| Stock insuficiente en origen (alta) o en destino (anulación) | `InsufficientStockException` | 409 `INSUFFICIENT_STOCK` |
| La variante no tiene stock en origen | `StockNotFoundException` | 404 |
| Sucursal, variante o transferencia inexistente | `ResourceNotFoundException` | 404 |

### Backend

1. **Paginar y ordenar el listado.** `GET ?page=0&size=20` (máx. 100, validado como
   `PaymentController`) → `PageResponse<StockTransferResponse>`, orden `createdAt DESC`.
   Repositorio: `Page<StockTransfer> findAllByCompanyId(companyId, Pageable)` con `@EntityGraph` sobre
   `originBranch`, `destinationBranch` y `createdBy` (no sobre `items`: fetch de colección + paginación
   se hace en memoria). Los ítems y sus variantes/productos por `@BatchSize` o una segunda consulta por
   ids, para no hacer N+1 en el mapper. Es un cambio de contrato: nadie más consume el endpoint.
2. **Code `INVALID_STOCK_TRANSFER`** en el handler de `InvalidStockTransferException` (sigue en 400).
   Para que el frontend distinga los casos sin leer el mensaje en inglés, alcanza con el code; los
   textos en español van en el frontend.
3. **Tests unitarios** de `StockTransferServiceImpl` (Mockito, como `AuthServiceImplTest`): origen =
   destino, variante repetida, stock insuficiente, anular anulada, anular con destino sin stock.
   Correr con `-Dtest=!BackendApplicationTests`.

### Frontend (módulo nuevo → TanStack Query)

1. **Tipos y servicio.** `types/transfer.ts` (`StockTransferResponse` de la API y `StockTransfer` de
   dominio con ids string, `status: 'CONFIRMED' | 'CANCELLED'`). `services/transfer-service.ts` con el
   patrón de `payment-service.ts`: `TransferServiceError` con `status`, `apiFetch`, mensajes propios:
   `INVALID_STOCK_TRANSFER` → "La transferencia no es válida (sucursales iguales, productos repetidos o
   ya anulada)."; `INSUFFICIENT_STOCK` → "No hay stock suficiente…"; 404 → "Sucursal, producto o stock
   no encontrados en el origen."; 403 y 5xx como pagos. Funciones: `getTransfers({page,size})`,
   `getTransferById`, `createTransfer`, `cancelTransfer`.
2. **Hooks** `hooks/use-transfer-queries.ts`: `transferKeys` (`all`, `list(pageSize)`, `detail(id)`),
   `useTransfers()` con `useInfiniteQuery` (reutilizar el patrón `usePagedList`; si se copia por segunda
   vez, moverlo a un helper compartido en `hooks/`), `useTransfer(id)`, `useCreateTransfer()` y
   `useCancelTransfer()`. Deshabilitadas sin token. Al crear: sembrar `detail(id)` con la respuesta e
   invalidar `list`. Al anular: `setQueryData` del detalle e invalidar `list`.
3. **Stock después de mutar** (`refreshStockAfterTransfer`, como `refreshAfterPayment`): el stock vive
   en Zustand, así que se relee solo lo ya cargado: `product-store.fetchProducts` si hay productos y
   `stock-store.fetchStocks` si hay stocks. Errores ignorados (se vuelven a pedir al abrir).
4. **Selector de variantes extraído.** Sacar de `(tabs)/orders/select-products.tsx` la lista con
   buscador y la lógica de selección (`filteredProducts`, `getSelectedVariant`, `attributeOptions`,
   estado de producto/atributos elegidos) a `components/products/VariantCatalog.tsx`, que recibe
   `branchId`, `getQuantity(productId, variantId)`, `onAddItem`, `onUpdateItemQuantity` y si muestra
   precio. Pedidos lo usa con `order-draft-store` sin cambiar comportamiento (probar alta de pedido de
   nuevo). Transferencias lo usa con estado local del alta. `ProductSelectionCard` gana una prop para
   ocultar el precio.
5. **Pantallas** — stack nuevo `src/app/(app)/transfers/` (`_layout.tsx` como `customers/_layout.tsx`):
   - `index.tsx`: listado infinito (número, origen → destino, fecha, cantidad de ítems, badge de estado
     con `StatusBadge`), pull to refresh, botón "Nueva" solo con `TRANSFERIR_STOCK`.
   - `[id].tsx`: detalle con ítems (producto, SKU, cantidad), usuario y fecha; "Anular" solo si está
     `CONFIRMED` y con `TRANSFERIR_STOCK`, con `confirmAction` destructivo que avisa que el destino
     debe tener el stock.
   - `new.tsx`: origen = sucursal activa (si no hay, `EmptyState` con acceso a elegirla, dentro de
     `settings`, que es del mismo nivel); destino = sucursales activas de la empresa
     (`branch-store.fetchAllBranches(token, true)`) menos el origen; ítems con cantidad 1..stock en
     origen (`variant.stockByBranch[originId]`) y opción de quitar; el catálogo se abre en un `Modal`
     dentro de la misma pantalla (sin estado global, sin navegar a otro stack). Botón deshabilitado sin
     destino o sin ítems y mientras la mutación está pendiente; al terminar, `router.replace` al detalle.
6. **Acceso.** `TRANSFER_READ_PERMISSIONS = ['TRANSFERIR_STOCK', 'CONSULTAR_STOCK']` en
   `utils/permissions.ts`; ítem "Transferencias" en la sección Operaciones de `(tabs)/more.tsx`.

### Validación

- Backend: `mvnw test -Dtest=!BackendApplicationTests`; levantar en 8082 contra `erp_qa` (avisar antes:
  compilar reinicia el backend de IntelliJ) y probar el contrato con curl, incluida la paginación.
- Frontend: `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`.

**Pruebas manuales.** Transferir entre dos sucursales y ver el stock en ambas (inventario y catálogo);
varias variantes en una transferencia; cantidad mayor al stock de origen; variante sin stock en destino
(se crea); anular y ver el stock restaurado; anular cuando el destino ya vendió parte (409); anular dos
veces; usuario con solo `CONSULTAR_STOCK` (ve, no crea ni anula); usuario sin ninguno (no ve el ítem);
alta de pedido sigue funcionando con el catálogo extraído.

**Fuera de alcance.** Validar asignación a la sucursal de origen o sucursales inactivas en el backend
(anotado como pendiente chico); flujo en dos pasos (enviada/recibida): hoy la transferencia se confirma
al crearla.

---

## Etapa 9 — Usuarios y roles

**Lo que ya existe en el backend.** Todo con `ADMINISTRAR_USUARIOS`:
- `/api/v1/users`: listado (`active?`), detalle, alta `{username, password, email, firstName, lastName,
  roleId}`, edición, activar/desactivar, `POST /{id}/password-reset` → contraseña temporal. Desactivar y
  resetear sobre uno mismo da 403.
- `/api/v1/roles`: listado, detalle, alta/edición `{name, code, description, permissions}`,
  activar/desactivar. Los roles `system` no se pueden editar (403).

**Plan.**
1. `services/user-service.ts` (mover ahí `getCompanyUsers`/`getBranchUsers` de `branch-service.ts`),
   `services/role-service.ts` y hooks TanStack.
2. Usuarios: listado con filtro de activos, alta con rol, edición, activar/desactivar, reset mostrando la
   contraseña temporal una sola vez. Ocultar las acciones sobre uno mismo.
3. Roles: listado, alta/edición con checklist de permisos (etiquetas en español), activar/desactivar.
4. Conectar el ítem "Usuarios" de `more.tsx`.

**Decisión a tomar.** Lista de permisos hardcodeada en el frontend o `GET /api/v1/roles/permissions` en
el backend (recomendado: evita que el enum se vuelva a desincronizar).

---

## Etapa 10 — Historial de movimientos de stock

Plan detallado el 2026-10-17, relevado contra el código y la base `erp_db`.

**Arranque.** Crear `feature/stock-movements` desde `feature/users-roles` (la etapa 9 ya está
commiteada).

**Decisiones del usuario (2026-10-17).**
- Guardar qué usuario generó cada movimiento.
- Registrar el stock que cambian el alta y la edición de producto, como `ADJUSTMENT` (sin tipo nuevo).
- Frontend: solo historial por stock, desde Inventario. Sin listado general por ahora.

**Lo que hay hoy** (`modules/inventory`, `/api/v1/inventory/movements`, lectura con `CONSULTAR_STOCK`,
`AJUSTAR_STOCK` o `VER_REPORTES`):
- `GET` (todo, sin paginar), `GET /{id}`, `GET /stock/{stockId}`, `GET /type/{type}`. Ninguno lo usa
  el frontend. `/stock/{stockId}` con un id de otra empresa o inexistente devuelve `[]`, no 404.
- `StockMovementResponse{id, stockId, type, quantity, previousQuantity, newQuantity, reason,
  referenceId, referenceType, createdAt, updatedAt}`: sin producto, variante, sucursal ni usuario.
- `quantity` es el delta con signo (venta −n, devolución +n, ajuste `nuevo − anterior`, transferencia
  salida −n / entrada +n). Al anular una transferencia se registra el inverso: el origen recibe
  `TRANSFER_IN` +n y el destino `TRANSFER_OUT` −n, con `referenceType = STOCK_TRANSFER`.
- Quién crea movimientos: `StockServiceImpl.adjustStock` (`ADJUSTMENT`, motivo del usuario, sin
  referencia), `OrderServiceImpl.saveMovement` (`SALE`/`RETURN`, `ORDER`) y
  `StockTransferServiceImpl` (`saveMovement` + dos builders sueltos en la anulación, `STOCK_TRANSFER`).
- **Huecos:** `StockServiceImpl.createInitialStock` (alta de producto) y
  `ProductServiceImpl.updateVariantStock` (edición de producto) cambian la cantidad sin registrar
  movimiento.
- La base tiene `stock_movements_type_check` con los 5 tipos actuales: un valor nuevo del enum
  rompería los inserts porque `ddl-auto: update` no toca el CHECK. Por eso no se agrega tipo.
- En `erp_db`, 12 de 19 stocks no tienen ningún movimiento: el historial previo no se puede
  reconstruir; la UI lo tiene que mostrar como vacío sin parecer un error.

### Backend

1. **Usuario en el movimiento.** `StockMovement.createdBy` → `@ManyToOne(fetch = LAZY)` a `User`,
   columna `created_by_id` **nullable** (las filas existentes quedan en null).
2. **Un solo lugar para crear movimientos.** `StockMovementRecorder` (componente en
   `modules/inventory/service`) con
   `record(Stock stock, StockMovementType type, int quantity, int previousQuantity, String reason,
   String referenceType, Long referenceId)`: arma el builder, `newQuantity = stock.getQuantity()`,
   `createdBy = userRepository.getReferenceById(SecurityUtils.getCurrentUserId())` y guarda.
   Reemplaza el builder de `adjustStock`, los `saveMovement` privados de órdenes y transferencias y
   los dos builders sueltos de la anulación de transferencias. Sin cambios de comportamiento: mismos
   tipos, signos y referencias (los tests existentes de órdenes tienen que seguir pasando).
3. **Movimientos del producto.** Constantes `PRODUCT_CREATION` y `PRODUCT_UPDATE` como
   `referenceType`, `referenceId = productId`, tipo `ADJUSTMENT`, `reason = null`:
   - `createInitialStock`: registrar solo si `quantity > 0` (previous 0). Recibe el `productId`
     (hoy solo recibe la variante) o se registra desde `ProductServiceImpl.createInitialStock`.
   - `updateVariantStock`: guardar la cantidad anterior antes de `setQuantity` y registrar solo si
     cambió (incluye llevarla a 0).
4. **Respuesta enriquecida.** `StockMovementResponse` suma `productId`, `productName`,
   `productVariantId`, `productVariantSku`, `branchId`, `branchName`, `createdById`,
   `createdByUsername` (los dos últimos null en movimientos viejos). Quitar `updatedAt` no hace falta.
5. **Listado paginado con filtros.** `GET /api/v1/inventory/movements?stockId=&branchId=
   &productVariantId=&type=&page=0&size=20` (máx. 100, validado como `PaymentController`) →
   `PageResponse<StockMovementResponse>`, orden `createdAt DESC, id DESC`. Consulta JPQL con
   `(:x IS NULL OR …)` como `OrderRepository`, `countQuery` aparte y `JOIN FETCH` solo de relaciones
   a-uno (`stock`, `stock.productVariant`, `productVariant.product`, `stock.branch`, `LEFT createdBy`),
   que se pueden paginar en la base. Si viene `stockId` y no es de la empresa → 404 (`StockNotFound`
   o `ResourceNotFoundException`). Se borran `GET /stock/{stockId}` y `GET /type/{type}` y sus métodos
   de repositorio/servicio (nadie los consume); `GET /{id}` queda con la respuesta nueva.
6. **Tests unitarios** (Mockito, `-Dtest=!BackendApplicationTests`): el recorder setea el usuario;
   ajuste registra delta y usuario; edición de producto registra solo si la cantidad cambia; alta con
   stock 0 no registra; listado con `stockId` ajeno da 404.

### Frontend (módulo nuevo → TanStack Query; el stock sigue en Zustand)

1. **Tipos y servicio.** `types/stock-movement.ts`: `StockMovementResponse` (API) y `StockMovement`
   (dominio, ids string, `type: 'SALE' | 'ADJUSTMENT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'RETURN'`).
   `services/stock-movement-service.ts` con el patrón de `transfer-service.ts` (`apiFetch`, error con
   `status`, mensajes en español): `getStockMovements({stockId, page, size})`.
2. **Hooks** `hooks/use-stock-movement-queries.ts`: `stockMovementKeys` (`all`,
   `byStock(stockId, pageSize)`), `useStockMovements(stockId)` con `usePagedList`
   (`hooks/use-paged-list.ts`). Deshabilitada sin token y sin permiso de lectura.
3. **Invalidar** `stockMovementKeys.all` después de lo que crea movimientos desde la app: ajuste
   (`StockAdjustModal`, tras `adjustStock`), `refreshStockAfterTransfer`, alta/edición de producto y
   alta/edición/cancelación de pedido. Lo que no se invalide se refresca solo por `staleTime` (30 s) y
   el pull to refresh.
4. **Etiquetas** `utils/stock-movement-labels.ts`: tipo → "Venta", "Ajuste", "Transferencia
   recibida", "Transferencia enviada", "Devolución"; referencia → "Pedido", "Transferencia", "Alta
   de producto", "Edición de producto". Un `ADJUSTMENT` con `PRODUCT_*` se muestra con la etiqueta de
   la referencia, no como "Ajuste".
5. **Pantalla** `src/app/(app)/inventory/[stockId].tsx` (+ `inventory/_layout.tsx` como
   `transfers/_layout.tsx`): encabezado con producto, SKU, sucursal y cantidad actual (desde
   `stock-store`; si no está cargado, `fetchStockById`); botón "Ajustar" con `AJUSTAR_STOCK` que abre
   el `StockAdjustModal` existente; lista infinita de movimientos (etiqueta, `+n`/`−n` con color,
   `anterior → nuevo`, motivo si hay, usuario y fecha), pull to refresh y `EmptyState` "Sin
   movimientos registrados" que aclara que el historial empieza a contar desde que existe el registro.
6. **Acceso.** `STOCK_MOVEMENT_READ_PERMISSIONS = ['CONSULTAR_STOCK', 'AJUSTAR_STOCK',
   'VER_REPORTES']` en `utils/permissions.ts`. En `inventory/index.tsx`, tocar un ítem navega al
   detalle si tiene permiso de movimientos o de ajuste (hoy solo abre el modal con `AJUSTAR_STOCK`).
   Quien entra a Inventario con `TRANSFERIR_STOCK` o `CREAR_PEDIDOS` y nada más sigue sin poder tocar
   el ítem.

### Validación

- Backend: `mvnw test -Dtest=!BackendApplicationTests`; levantar en 8082 contra `erp_qa` (avisar
  antes: compilar reinicia el backend de IntelliJ) y probar con curl: paginación, filtros, 404 con
  `stockId` ajeno, `createdByUsername` en movimientos nuevos y null en viejos.
- Frontend: `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`.

**Pruebas manuales.** Ajustar stock y verlo arriba del historial con el usuario y el motivo; vender,
editar y cancelar un pedido (venta y devoluciones); transferir y anular (entrada/salida en ambas
sucursales); crear un producto con stock inicial y editar su stock, también a 0 (aparecen como "Alta
de producto"/"Edición de producto"); editar un producto sin tocar el stock (no aparece nada); stock sin
movimientos (vacío); usuario con solo `CONSULTAR_STOCK` (ve el historial, no el botón Ajustar);
usuario con solo `CREAR_PEDIDOS` (no entra al detalle).

**Fuera de alcance.** Listado general de movimientos con filtros en el frontend (el endpoint queda
listo); exportar; reconstruir historial de stocks viejos.

---

## Etapa 11 — Errores en español y robustez del backend

Plan detallado el 2026-10-17, relevado contra el código.

**Arranque.** Crear `feature/error-handling` desde `feature/stock-movements`.

**Decisiones del usuario (2026-10-17).**
- Backend: el `code` de cada error de negocio se asigna con un `switch` en `GlobalExceptionHandler`,
  como los duplicados de usuarios y roles (sin clase base de excepciones).
- Frontend: un helper común de errores y se migran **todos** los servicios, también los que ya
  mapeaban por `code`, para que quede un solo patrón.

**Lo que hay hoy.**
- Backend (`config/GlobalExceptionHandler.java`):
  - `CompanyTaxIdAlreadyExistsException` no tiene handler → 500 (alta de empresa en provisioning).
  - Excepciones de Spring MVC sin handler caen en el catch-all como 500:
    `MethodArgumentTypeMismatchException` (`?type=FOO`, `/movements/stock/1`),
    `HttpRequestMethodNotSupportedException` (un `PUT` a `/products/{id}`),
    `MissingServletRequestParameterException`, `HttpMediaTypeNotSupportedException`,
    `NoResourceFoundException`.
  - El catch-all devuelve `ex.getMessage()` (expone detalles internos) y no loguea nada.
  - `ProductServiceImpl` lanza `IllegalArgumentException` por sucursal repetida en `initialStock` y en
    `stock` → 500 en vez de 400.
  - Sin `code`: el grupo de 409 de `handleConflict` (sucursal, categoría, SKU de producto y de
    variante, atributo, valor de atributo, documento de cliente, nombre de empresa y
    `ProductCategoryNotActiveException`), `ResourceNotFoundException`, `StockNotFoundException`,
    `StockAlreadyExistsException`, `AccessDeniedException`, `OrderAlreadyHasShipmentException`,
    `InvalidCustomerDocumentException`, validación (`MethodArgumentNotValidException`) y
    `DataIntegrityViolationException`.
- Frontend (`src/services`, 15 servicios):
  - `branch`, `category`, `product`, `product-attribute` y `stock-service` muestran
    `payload.message` (inglés) cuando viene; `order-service` también, en el fallback de los códigos
    que no conoce.
  - `customer`, `customer-account`, `payment`, `transfer`, `user`, `role` y `stock-movement` ya
    mapean por `status`/`code`, cada uno con su propia clase de error (`CustomerServiceError`, …)
    que solo se usa para exponer `status` a `query-client`. Ninguna pantalla las importa.
  - `auth-service` tiene su propio `readErrorPayload`; `api-client` tiene `readErrorCode`.
  - Un fallo de red llega como `TypeError: Network request failed` (inglés) a todas las pantallas
    salvo login y cambio de contraseña, que lo detectan comparando el texto.

### Backend

1. **Codes en los errores de negocio** (mismo status que hoy):
   - 409 de `handleConflict` → `switch`: `BRANCH_NAME_ALREADY_EXISTS`, `CATEGORY_NAME_ALREADY_EXISTS`,
     `PRODUCT_SKU_ALREADY_EXISTS`, `VARIANT_SKU_ALREADY_EXISTS`, `ATTRIBUTE_NAME_ALREADY_EXISTS`,
     `ATTRIBUTE_VALUE_ALREADY_EXISTS`, `CUSTOMER_DOCUMENT_ALREADY_EXISTS`,
     `COMPANY_NAME_ALREADY_EXISTS`, `CATEGORY_INACTIVE`; sumar `CompanyTaxIdAlreadyExistsException`
     → 409 `COMPANY_TAX_ID_ALREADY_EXISTS`.
   - `STOCK_ALREADY_EXISTS` (409), `ORDER_ALREADY_HAS_SHIPMENT` (409), `INVALID_CUSTOMER_DOCUMENT`
     (400), `STOCK_NOT_FOUND` y `NOT_FOUND` (404), `FORBIDDEN` (403), `VALIDATION_ERROR` (400),
     `DATA_INTEGRITY_VIOLATION` (409).
   - Los codes que ya existen no cambian (el frontend los usa).
2. **Errores del framework** (handlers nuevos, mensaje genérico en inglés, como los demás):
   `MethodArgumentTypeMismatchException` y `MissingServletRequestParameterException` → 400
   `INVALID_PARAMETER`; `HttpRequestMethodNotSupportedException` → 405 `METHOD_NOT_ALLOWED`;
   `HttpMediaTypeNotSupportedException` → 415 `UNSUPPORTED_MEDIA_TYPE`;
   `NoResourceFoundException` → 404 `NOT_FOUND`. No se devuelve el detalle de Spring (como hoy con
   `MALFORMED_REQUEST`).
3. **Catch-all**: loguear la excepción con stack trace (`@Slf4j`/`LoggerFactory`) y responder
   `"Internal server error"` con `INTERNAL_ERROR`, sin `ex.getMessage()`.
4. **`IllegalArgumentException` de `ProductServiceImpl`** (sucursal repetida) →
   `InvalidProductVariantsException` (400 `INVALID_PRODUCT_VARIANTS`, ya existe). Los
   `IllegalArgumentException` de `CustomerAccountServiceImpl` son guardas de programación: quedan.
5. **Tests**: `GlobalExceptionHandlerTest` con `MockMvcBuilders.standaloneSetup` sobre un controller
   de prueba + el advice: parámetro con tipo inválido (400), método no soportado (405), excepción de
   negocio con su code, catch-all sin el mensaje interno. Más el caso de sucursal repetida en
   producto. Correr con `-Dtest=!BackendApplicationTests` en la copia del scratchpad.

### Frontend

1. **`src/services/api-error.ts`**:
   - `ApiError extends Error` con `status` (0 = sin conexión) y `code`.
   - `readErrorPayload(response)` (mueve el de `auth-service`; `readErrorCode` de `api-client` pasa
     a usarlo).
   - `toApiError(response, { byCode?, byStatus?, fallback })`: elige el mensaje por `code`, después
     por `status` y si no el `fallback`; **nunca** usa `payload.message`. Mensajes comunes por
     defecto: 403 "No tenés permisos para realizar esta acción.", ≥500 "Error del servidor. Intentá
     de nuevo más tarde.", `VALIDATION_ERROR`/400 "Revisá los datos ingresados.".
2. **Sin conexión**: `apiFetch` atrapa el `TypeError` de `fetch` y lanza
   `ApiError(…, 0, 'NETWORK_ERROR')` con "No se pudo conectar con el servidor. Revisá tu conexión.".
   `login.tsx` y `change-password.tsx` pasan a chequear `code === 'NETWORK_ERROR'` en lugar del texto.
3. **Migrar los 15 servicios** a `toApiError` con sus mensajes por `code` (los textos actuales se
   conservan; se suman los codes nuevos: "Ya existe una sucursal con ese nombre.", "Ya existe un
   producto/variante con ese SKU.", "La categoría está inactiva.", …). Se borran las clases
   `*ServiceError` y los `handleResponse` duplicados; `query-client.statusOf` sigue funcionando
   porque `ApiError` tiene `status`. Respetar las respuestas sin body (`201`/`204`) que hoy
   devuelven `null` (asignación de sucursales, reset de contraseña, etc.).
4. Revisar las pantallas que arman su propio texto con `err.message` en inglés (no debería quedar
   ninguna: todas reciben el mensaje del servicio).

### Validación

- Backend: tests unitarios en la copia del scratchpad; instancia QA en 8082 contra `erp_qa` y curl
  de: `?type=FOO` (400), `PUT /products/1` (405), ruta inexistente (404), SKU repetido (409 con
  code), sucursal repetida en `stock` (400).
- Frontend: `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`.

**Pruebas manuales.** Duplicar nombre de sucursal, categoría, atributo y valor; SKU repetido al crear
y al editar producto; producto con categoría inactiva; documento de cliente repetido; anular
transferencia sin stock en destino; usuario/email repetidos; backend apagado (mensaje de conexión en
login y en cualquier listado); sesión expirada sigue mostrando el overlay; asignar/quitar sucursal a
un usuario (respuesta sin body) sigue sin rollback.

**Fuera de alcance.** Traducir los `message` del backend (siguen en inglés, solo para logs/Swagger);
detalle por campo de los errores de validación en la UI.

---

## Etapa 12 — Dashboard / reportes

Plan detallado el 2026-10-19, relevado contra el código.

**Arranque.** Crear `feature/reports` desde `feature/error-handling` (la etapa 11 ya está commiteada).

**Decisiones del usuario (2026-10-19).**
- Métricas: ventas del período (con comparación y por sucursal), cobranzas y deuda, top productos y
  pedidos pendientes, stock bajo.
- Ubicación: ítem "Reportes" en Más (reemplaza "Analytics – Próximamente"), stack propio. Las
  pestañas no cambian.
- Alcance: las sucursales **asignadas al usuario** (mismo criterio que `GET /orders`), con filtro
  opcional por una de ellas.
- Stock bajo: umbral fijo, enviado como parámetro (sin cambios en la base).
- Vista "todas las sucursales" = la unión de las sucursales asignadas, además del filtro por una.
- **Mandan las asignaciones**: el acceso a una sucursal sale siempre de `user_branches`, también para
  el admin, y el toggle de `BranchUsersAssignmentModal` se respeta. `ACCEDER_TODAS_SUCURSALES` no
  abre sucursales no asignadas: significa "se asigna solo a las sucursales nuevas".
- Al crear una sucursal, el backend asigna en la misma transacción al creador y a todos los usuarios
  de la empresa cuyo rol tiene `ACCEDER_TODAS_SUCURSALES` (el admin lo tiene desde su creación).
  Después cada uno se puede desasignar con el toggle.

**Lo que hay hoy.**
- `VER_REPORTES` existe en el enum y solo abre lecturas sueltas (deudores, pagos, movimientos). No hay
  ningún endpoint de reportes ni consultas de agregación.
- Ventas = `orders`: `total` (para `QUICK_SALE` es `quickSaleAmount`), `status`
  (`CONFIRMED` = retiro en local, `TO_PREPARE` = envío por despachar, `SHIPPED`, `CANCELLED`),
  `branch`, `customer` (opcional), `createdAt` (`Instant`, la base guarda UTC). Ítems en
  `order_items` (`quantity`, `unitPrice`, variante); las ventas rápidas no tienen ítems.
- Cobro: las ventas **sin cliente** se consideran cobradas al crearse y no generan `Payment`, así que
  no tienen medio de pago. Las de cliente se cobran con `payments` (`amount`, `method`: `CASH`,
  `TRANSFER`, `DEBIT_CARD`, `CREDIT_CARD`; `status` `ACTIVE`/`CANCELLED`; `branch`; `createdAt`).
- Deuda: `CustomerBalanceServiceImpl` la calcula desde `orderRepository.findPendingBalances`
  (saldo pendiente de cada pedido de cliente); es lo que muestra Cuentas corrientes.
- Stock: `stocks.quantity` por variante y sucursal, sin mínimo. `Product.active` y
  `ProductVariant.active` existen.
- `ACCEDER_TODAS_SUCURSALES` existe en el enum desde 2d0c4f9 y el backend nunca lo chequea
  (`permission-labels.ts` lo marca "Todavía sin efecto en la app."). El rol "Administrador" que crea
  `ProvisioningServiceImpl.createAdminRole` ya lo trae (`EnumSet.allOf(Permission.class)`) y es
  `system_role` (no editable). En `erp_db` (2026-10-19): ADMIN con los 17 permisos; el rol `123` sin él.
- **Hoy crear una sucursal no asigna a nadie**: ni `BranchServiceImpl.create` ni
  `branch-store.createBranch`/`BranchFormModal`. Lo único que asigna solo es
  `selectAndEnsureAssigned` (elegir una sucursal como activa desde Sucursales). En `erp_db`
  `adminYuyei` está asignado a las dos sucursales y `empleadoYuyei` a Gral. Pico: no hace falta
  migrar datos.
- La asignación se chequea con `userBranchRepository` en `OrderServiceImpl`, `PaymentServiceImpl` y
  `ShipmentServiceImpl`; esos chequeos no cambian.
- Frontend: sin librería de gráficos (no hace falta: barras con `View` y ancho en %).
  `src/data/mock-dashboard.ts` sin uso. Etiquetas de medio de pago en `types/order.ts`.

### Backend (módulo nuevo `modules/reports`)

0. **Autoasignación al crear una sucursal** (`BranchServiceImpl.create`, ya `@Transactional`):
   después de guardar la sucursal, crear las `UserBranch` del creador (`SecurityUtils.getCurrentUserId()`)
   y de los usuarios de la empresa con `ACCEDER_TODAS_SUCURSALES`, sin duplicados (el creador suele
   ser uno de ellos). Consulta nueva en `UserRepository`:
   `SELECT u FROM User u JOIN u.role r JOIN r.permissions p WHERE u.company.id = :companyId AND
   p = :permission` (activos o no: la asignación no le da acceso a un usuario inactivo y así no
   queda sin la sucursal si lo reactivan). Se guardan con `saveAll`, una sola vez por usuario.
   Si falla, no se crea la sucursal. La respuesta `BranchResponse` no cambia. Las sucursales
   existentes no se tocan.
1. **Endpoint** `GET /api/v1/reports/dashboard?from=&to=&branchId=&lowStockThreshold=5` con
   `@PreAuthorize("hasAuthority('VER_REPORTES')")` → `DashboardResponse`. Uno solo para que la
   pantalla haga una request.
   - `from`/`to`: `Instant` ISO (`@DateTimeFormat(iso = DATE_TIME)`), `from` inclusivo y `to`
     exclusivo. El frontend los calcula con la hora del dispositivo, así el backend no necesita zona
     horaria. Período anterior = la misma duración inmediatamente antes (`[from − (to − from), from)`).
   - Validación: `from < to`, rango ≤ 366 días, `lowStockThreshold` entre 0 y 1000 →
     `InvalidReportRangeException`, 400 `INVALID_REPORT_RANGE` (handler propio, como la etapa 11).
   - Sucursales: las asignadas (`userBranchRepository.findByUserId`, como `OrderServiceImpl.findAll`).
     Sin `branchId` → la unión de todas (cada bloque suma todas; `salesByBranch` trae además el
     desglose). Con `branchId` → solo esa. Es el valor por defecto de la pantalla. Sin asignaciones
     → todo en cero/vacío. `branchId` de otra empresa → 404; no asignada → 403.
2. **Contenido de `DashboardResponse`** (montos `BigDecimal`, cantidades `long`):
   - `sales {orderCount, total, averageTicket}` y `previousSales` (mismo formato): pedidos no
     `CANCELLED` con `createdAt` en el rango.
   - `salesByBranch [{branchId, branchName, orderCount, total}]`, orden `total DESC`.
   - `collections {byMethod [{method, total}], walkInSalesTotal}`: pagos `ACTIVE` del rango por
     medio, y aparte el total de ventas sin cliente (cobradas sin medio registrado). Un pago anulado
     después deja de contar (se reporta lo vigente).
   - `debt {totalDebt, debtorCount}`: método nuevo en `CustomerBalanceService` que reutiliza
     `findPendingBalances` (misma cifra que Cuentas corrientes). Es de toda la empresa: no depende del
     rango ni de la sucursal (aclararlo en la UI).
   - `topProducts [{productVariantId, productName, sku, quantity, total}]`: 10 variantes con más
     unidades en pedidos no cancelados del rango (`SUM(quantity)`, `SUM(quantity * unitPrice)`).
   - `pendingOrders {count, oldestCreatedAt}`: pedidos `TO_PREPARE` de las sucursales (foto actual,
     no depende del rango).
   - `lowStock {threshold, count, items [{stockId, productName, sku, branchName, quantity}]}`:
     stocks con `quantity <= threshold` de productos y variantes activos, orden `quantity ASC`,
     máximo 20 ítems más el total.
3. **Consultas** JPQL de agregación en los repositorios de cada módulo (`OrderRepository`,
   `PaymentRepository`, `StockRepository`), filtrando siempre por `companyId` y la lista de
   sucursales. Una consulta por bloque, ninguna por fila. Top productos y stock bajo con `Pageable`
   (`PageRequest.of(0, n)`) para el límite. Si hace falta, índice en `orders(company_id, created_at)`.
4. **Tests unitarios** (Mockito, `-Dtest=!BackendApplicationTests`): rango inválido (`from >= to`,
   más de 366 días), cálculo del período anterior, `branchId` no asignado (403), usuario sin
   sucursales (todo en cero sin consultar), ticket promedio con 0 pedidos (0, sin dividir por cero).
   Alta de sucursal: asigna al creador y a los usuarios con el permiso, sin duplicar al creador;
   creador sin el permiso igual queda asignado; usuario de otra empresa nunca se asigna.

### Frontend (módulo nuevo → TanStack Query)

1. **Tipos y servicio.** `types/report.ts`: `DashboardResponse` (API) y `Dashboard` (dominio, ids
   string, montos `number`). `services/report-service.ts` con `apiFetch` y `toApiError`
   (`INVALID_REPORT_RANGE` → "El período elegido no es válido."; 403 y 5xx por defecto):
   `getDashboard({from, to, branchId, lowStockThreshold})`.
2. **Hooks** `hooks/use-report-queries.ts`: `reportKeys` (`all`, `dashboard(period, branchId)`),
   `useDashboard(period, branchId)` con `useQuery`. La clave lleva el período (`'today' | '7d' |
   '30d'`), no las fechas: `from`/`to` se calculan dentro del `queryFn`, así cada refetch usa la hora
   actual. Deshabilitada sin token y sin `VER_REPORTES`. Sin invalidaciones desde otras pantallas: se
   refresca por `staleTime` y pull to refresh.
3. **Períodos** (`utils/report-periods.ts`): Hoy = desde las 00:00 locales hasta ahora; 7 y 30 días =
   desde las 00:00 de hace 6/29 días hasta ahora. La comparación muestra la variación % contra el
   período anterior; si el anterior es 0, "Sin datos del período anterior" en lugar de un %.
4. **Pantalla** `src/app/(app)/reports/_layout.tsx` (como `transfers/_layout.tsx`) e `index.tsx`:
   - Arriba: chips de período y selector de sucursal ("Todas las sucursales" por defecto +
     `availableBranches` de `branch-store`).
   - Tarjetas: **Ventas** (total, pedidos, ticket promedio, variación); **Por sucursal** (barras con
     `View`, solo si hay más de una); **Cobranzas** (por medio con las etiquetas de `types/order.ts`,
     más "Ventas sin cliente"); **Deuda de clientes** (total y cantidad de deudores, con la nota "de
     toda la empresa"); **Más vendidos** (nombre, SKU, unidades, total); **Pedidos por despachar**
     (cantidad y antigüedad del más viejo); **Stock bajo** (cantidad y lista, umbral visible).
   - Pull to refresh, `LoadingState`/error con reintento, y `EmptyState` si el usuario no tiene
     sucursales asignadas.
   - Sin enlaces a otros stacks (deudores, envíos, inventario): ya están en Más.
5. **Acceso.** En `(tabs)/more.tsx`, "Analytics – Próximamente" pasa a "Reportes" → `/reports`, solo
   con `VER_REPORTES`. `LOW_STOCK_THRESHOLD = 5` como constante del módulo.
6. **Alta de sucursal.** `branch-store.createBranch` suma la sucursal nueva también a
   `availableBranches` (el creador siempre queda asignado), así aparece en el selector de sucursal
   activa y en el reporte sin recargar. El modal de usuarios ya la muestra asignada porque relee las
   asignaciones al abrirse. En `permission-labels.ts` la etiqueta de `ACCEDER_TODAS_SUCURSALES`
   **no cambia** ("Acceder a todas las sucursales", decisión del usuario); el hint "Todavía sin
   efecto en la app." pasa a "Se asigna automáticamente a cada sucursal nueva.".
7. **Limpieza.** Borrar `src/data/mock-dashboard.ts`.

### Validación

- Backend: `mvnw test -Dtest=!BackendApplicationTests`; levantar en 8082 contra `erp_qa` (avisar
  antes: compilar reinicia el backend de IntelliJ). Cargar pedidos (con y sin cliente, uno
  cancelado, uno de envío), pagos (uno anulado) y stock bajo, y comparar con curl cada bloque contra
  lo esperado; rango inválido (400), sucursal no asignada (403), usuario sin `VER_REPORTES` (403).
  Crear una sucursal y comprobar en `user_branches` al creador y a los usuarios con el permiso.
- Frontend: `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`.

**Pruebas manuales.** Vender y ver el total del día subir tras pull to refresh; cancelar un pedido y
verlo salir; venta rápida (cuenta en ventas, no en más vendidos); venta sin cliente (aparece en
"Ventas sin cliente", no en cobranzas por medio); registrar y anular un pago; filtrar por sucursal y
por período; usuario asignado a una sola sucursal (no ve las demás); usuario sin `VER_REPORTES` (no ve
el ítem); llevar un stock a 0 y verlo en stock bajo. Crear una sucursal como admin: aparece asignada
en el modal de usuarios y en el selector de sucursal activa sin recargar; desasignarse con el toggle:
desaparece del reporte ("Todas") y del selector. Un rol con `ACCEDER_TODAS_SUCURSALES` queda asignado a
la sucursal nueva; uno sin el permiso, no.

**Fuera de alcance.** Mínimo de stock por variante; gráficos por día y librería de gráficos;
exportar; rangos de fecha libres; contar como stock 0 las variantes sin fila de stock en una
sucursal; chequear la asignación en stock y transferencias (hoy no la chequean, sigue en pendientes).

---

## Pendientes chicos (sin orden; sumar a la etapa afín)

- **Bug:** `products/[id]/index.tsx:32,142` lee `attributeValues` del store sin cargarlos; si no se
  cargaron en otra pantalla, muestra el id del valor en lugar del nombre.
- `fetchAttributes` hace una request de valores por atributo (N+1).
- `product-store` pide todo `/inventory/stocks` y pisa `variant.stock`, que ya viene en el producto.
  Verificar antes de cambiar la estrategia.
- Redirección inicial inconsistente: `index.tsx` y `login.tsx` van a `/orders`, `_layout.tsx:45` a
  `/shipments`.
- `customers/[id]/debts.tsx` solo se abre desde `debtors.tsx`; evaluar acceso desde el detalle del cliente.
- Pedidos: `normalizeOrder` descarta `paymentStatus` y `balance` (útiles en el listado); `quickSaleAmount`
  no se puede editar; no hay transición CONFIRMED → TO_PREPARE en el backend.
- Limpieza: `FRONTEND_DOCS.md` desactualizado (describe dashboard y login mock); clave huérfana
  `@erp/active-branch-id` en AsyncStorage; funciones sin uso (`getBranchById`, `getCategoryById`,
  `getStockById`, `getStocksByVariant`); "Mi Perfil" sin acción en `more.tsx`.
- Migrar los demás módulos a TanStack Query, de a uno y con decisión explícita (pedidos primero).
- Precio al editar un pedido: los ítems toman el precio actual de la variante. Confirmar si es lo deseado.
- Permiso que el backend nunca chequea: `ADMINISTRAR_PRECIOS` (`ACCEDER_TODAS_SUCURSALES` toma
  sentido en la etapa 12: autoasignación a sucursales nuevas).
- Transferencias: el backend no valida que el usuario esté asignado a la sucursal de origen ni que
  origen/destino estén activas.
- `BackendApplicationTests` (test de contexto) falla desde 2026-10-06; los unitarios se corren con
  `-Dtest=!BackendApplicationTests`.
