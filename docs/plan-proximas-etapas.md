# Plan de las etapas que quedan

Estado al 2026-10-20, rama `feature/catalog-feedback`. Para retomar: pasarle este archivo a
Claude y elegir la etapa (la próxima planificada es la 18).

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
- React Compiler activo (`app.json`): no llamar en el render funciones del store que lean `get()`
  (se memorizan y no ven los cambios); derivar del estado seleccionado.
- Cada stack declara `unstable_settings = { anchor: 'index' }` para que F5 en web no rompa la
  flecha atrás; un stack nuevo lo tiene que declarar también.
- Las pruebas de UI las hace el usuario; no automatizar navegador.

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
- **Etapa 12 — Dashboard / reportes** (`feature/reports`, b61995b y 90e99cb):
  `GET /reports/dashboard` (ventas con comparación y por sucursal, cobranzas, deuda, más vendidos,
  pedidos por despachar, stock bajo) sobre las sucursales asignadas; pantalla Reportes en Más.
  Alta de sucursal asigna al creador y a los usuarios con `ACCEDER_TODAS_SUCURSALES`.
- **Etapa 13 — Asignaciones en stock y transferencias** (`feature/branch-access`, 6fb8fac y
  ea8166d): `BranchAccessService` (asignada + activa; 403 `BRANCH_ACCESS_DENIED`, 409
  `BRANCH_INACTIVE`) en pedidos, pagos, envíos, reportes, ajuste, transferencias, movimientos y
  stock de producto; sucursal inactiva = no asignada; botón Desactivar/Activar con confirmación.
  Aparte (f955655): login sin distinguir mayúsculas en el usuario.
- **Etapa 14 — Productos y atributos** (`feature/products-attributes`, 1833340 y 2622638): el
  producto trae su stock (una consulta), `GET /product-attributes/values`, nombres de atributo en
  el detalle. Aparte: c680f4e anclas de navegación (F5 en web), d9a2d74 categoría en la consulta
  del listado (9 → 4 consultas), de4b3bb detalle de atributo tras F5 (React Compiler).
- **Etapa 15 — Pedidos a TanStack Query** (`feature/orders-query`, 7b7a9fd y 2618b15): al editar,
  lo que ya estaba conserva su precio; `use-order-queries` (caché por filtros, detalle con
  placeholder, edición con datos frescos), badge de pago y saldo en el listado,
  `refreshStockAfterChange` compartido. Operaciones con stack propio (ancla y edición dentro del
  stack; rutas auxiliares del formulario por flujo en `utils/order-routes.ts`).
- **Etapa 16 — Productos y stock a TanStack Query** (`feature/products-query`, fa48ff0 y 01ed9b3):
  `GET /products` y `GET /inventory/stocks` paginados y filtrados en la base (búsqueda sin tildes,
  stock por sucursal o total, `variantIds`); `use-product-queries`, `use-stock-queries` y
  `catalog-keys`; límites del borrador con `useVariantStock` (bajar ya no borra el ítem, al editar
  se suma lo reservado y se conserva el precio vendido); ajuste de stock solo del detalle.
- **Etapa 17 — Categorías y atributos; avisos y confirmaciones** (`feature/catalog-feedback`,
  3f204f8): `use-category-queries` y `use-attribute-queries` (listas completas), toasts y diálogo
  propios en el layout raíz (sin `Alert.alert` ni `window.confirm`), confirmación al cancelar un
  pedido, toast al registrar una venta o un envío, selector de categoría sin inactivas.
- **Etapa 18 — Sucursales a TanStack Query; Mi Perfil y limpieza** (`feature/branches-query`):
  el store de sucursales guarda solo `activeBranchId`; `use-branch-queries` (`useMyBranches`,
  `useActiveBranch` derivada por id, `useActiveBranchSync`), pantalla Mi Perfil, precio de variante
  mayor a 0 (backend y formulario), borrado de `FRONTEND_DOCS.md`, `OrdersFilterList` y
  `getBranchById`. Ya no queda ningún dato del servidor en Zustand.

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
   - `from`/`to`: `Instant` ISO, `from` inclusivo y `to` exclusivo. El frontend los calcula con la
     hora del dispositivo, así el backend no necesita zona horaria.
   - Período anterior: `previousFrom` opcional → `[previousFrom, previousFrom + (to − from))`; sin
     él, el inmediatamente anterior. *Ajuste al implementar:* con "Hoy" a las 15 h, el
     inmediatamente anterior serían las 15 h previas a la medianoche; el frontend manda el mismo
     tramo corrido 1/7/30 días (ayer hasta las 15 h). Si se superpone con el actual → 400.
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

## Etapa 13 — Asignaciones en stock y transferencias; sucursales inactivas

Plan detallado el 2026-10-19, relevado contra el código.

**Arranque.** Crear `feature/branch-access` desde `feature/reports` (la etapa 12 ya está commiteada).

**Objetivo.** Completar la regla de la etapa 12 (*mandan las asignaciones*) en lo que todavía no la
cumple —stock, transferencias, movimientos, stock de productos— y que una sucursal inactiva cuente
como no asignada en todos lados.

**Decisiones del usuario (2026-10-19).**
- **Escrituras** de stock: ajustar y transferir exigen tener asignada la sucursal (en la
  transferencia, el origen). El destino puede ser cualquier sucursal activa de la empresa.
- **Anular una transferencia**: alcanza con `TRANSFERIR_STOCK` (ya es lo que pide hoy); no se
  chequea asignación. No se crea permiso nuevo.
- **Lecturas**: las cantidades de stock siguen siendo de toda la empresa (sirve para saber si otra
  sucursal tiene un producto antes de pedir una transferencia). Movimientos y transferencias, solo
  de las sucursales accesibles: una transferencia se ve si el origen **o** el destino lo es.
- **Producto**: el alta y la edición solo pueden cambiar el stock de sucursales accesibles. Se
  chequea solo donde la cantidad cambia (la edición reenvía todas las sucursales con su valor).
- **Inactiva = no asignada**: desactivar una sucursal no borra sus asignaciones, así que el chequeo
  común exige asignada **y** activa. "Es como si estuviera eliminada, pero se puede reactivar": al
  reactivarla todo vuelve como estaba.

**Lo que hay hoy.**
- Chequean la asignación (sin mirar `active`): `OrderServiceImpl` (`validateBranchAccess`, listado y
  detalle con `isUserAssignedToBranch`), `PaymentServiceImpl` (alta y anulación),
  `ShipmentServiceImpl.findOrderOrThrow` y `ReportServiceImpl.resolveBranchIds`. Cada uno con su
  propia copia y `AccessDeniedException` → 403 `FORBIDDEN`.
- No la chequean: `StockServiceImpl.adjustStock` (solo `AJUSTAR_STOCK` y empresa),
  `StockTransferServiceImpl.create` (solo empresa; origen y destino pueden estar inactivos), el
  listado y el detalle de transferencias (`findAllByCompanyId`), `StockMovementServiceImpl` (filtra
  por `branchId` opcional de toda la empresa), `ProductServiceImpl.createInitialStock` y
  `updateVariantStock`.
- Ninguna operación mira `Branch.active`. Solo el frontend oculta las inactivas
  (`hydrateActiveBranch` filtra `active !== false`; `transfers/new.tsx` también en el destino).
  `availableBranches` (de `GET /users/{id}/branches`) puede traer inactivas: el selector de
  sucursal de Reportes las mostraría.
- Frontend: `errorMessageFor` da prioridad al 403 de cada servicio sobre los codes comunes, así que
  un code nuevo hay que sumarlo en el `byCode` de cada servicio afectado.

### Backend

1. **Un solo chequeo** `BranchAccessService` (componente en `modules/branches/service`):
   - `List<Long> accessibleBranchIds()`: asignadas al usuario actual, de su empresa y activas
     (consulta nueva en `UserBranchRepository` con `JOIN ub.branch b WHERE b.active = true`).
   - `Branch requireAccessible(Long branchId)`: 404 si no es de la empresa; si no está asignada o
     está inactiva → `BranchAccessDeniedException`, 403 `BRANCH_ACCESS_DENIED` (handler propio).
   - `Branch requireActive(Long branchId)`: para el destino de una transferencia (sin asignación):
     404 si no es de la empresa, inactiva → `BranchInactiveException`, 409 `BRANCH_INACTIVE`.
   - `boolean isAccessible(Long branchId)` para los filtros de detalle.
2. **Reemplazar las copias** en pedidos, pagos, envíos y reportes por el servicio (mismo
   comportamiento + el chequeo de `active`; el 403 pasa de `FORBIDDEN` a `BRANCH_ACCESS_DENIED`).
   Consecuencia de "inactiva = no asignada": los pedidos de una sucursal inactiva dejan de verse en
   Pedidos/Envíos/Reportes y no se pueden editar, cancelar ni cobrar hasta reactivarla. La deuda de
   Cuentas corrientes sigue siendo de toda la empresa (no cambia). Confirmado por el usuario
   (2026-10-19).
3. **Stock**: `adjustStock` → `requireAccessible(branchId)`. Las lecturas de `StockController` no
   cambian.
4. **Transferencias**:
   - `create`: `requireAccessible(origin)` y `requireActive(destination)`.
   - `cancel`: sin cambios (solo `TRANSFERIR_STOCK`).
   - Listado: `findAllByAccessibleBranches(companyId, branchIds, pageable)` —
     `origin.id IN :ids OR destination.id IN :ids`—, misma `@EntityGraph` y carga de ítems; sin
     sucursales accesibles → página vacía sin consultar. Detalle: 404 si ninguna punta es
     accesible. Queda la asimetría aceptada: por la API se puede anular una transferencia que no
     se ve (en la app no se llega).
5. **Movimientos**: `search` recibe la lista de accesibles (`s.branch.id IN :branchIds`); `branchId`
   o `stockId` de una sucursal no accesible → 403 `BRANCH_ACCESS_DENIED` (de otra empresa sigue 404).
   `GET /{id}` igual.
6. **Producto**: en `createInitialStock` (cantidad > 0) y `updateVariantStock` (cantidad distinta
   de la anterior) → `requireAccessible(branchId)`. Una sucursal con cantidad 0 en el alta, o igual
   a la actual en la edición, no se chequea.
7. **Tests unitarios** (Mockito, `-Dtest=!BackendApplicationTests`): `BranchAccessService` (no
   asignada, inactiva, otra empresa, accesible); ajuste en sucursal no asignada; transferencia con
   origen no asignado, origen inactivo y destino inactivo; listado de transferencias filtrado;
   movimientos con `branchId` no accesible; edición de producto que cambia el stock de una sucursal
   no asignada (403) y que la reenvía igual (ok). Ajustar los tests existentes de pedidos, pagos y
   reportes que mockean `userBranchRepository`.

### Frontend

1. **Mensajes**: `BRANCH_ACCESS_DENIED` → "No tenés asignada esta sucursal o está inactiva." y
   `BRANCH_INACTIVE` → "La sucursal de destino está inactiva." en el `byCode` de los servicios
   afectados (`stock`, `transfer`, `order`, `payment`, `shipment`, `report`, `stock-movement`,
   `product`).
2. **Sucursales inactivas fuera de la UI**: `availableBranches` excluye las inactivas al cargarse
   (`fetchUserBranches`), así no aparecen en el selector de sucursal activa ni en el de Reportes.
   Revisar que `branches/index.tsx` (que usa `availableBranches` para `canSelect`) siga bien.
3. **Sucursal activa desactivada o desasignada en plena sesión**: el backend ya la rechaza. Hoy
   `(app)/_layout.tsx` llama a `fetchUserBranches` una sola vez; sumarlo al listener de `AppState`
   que ya llama a `refreshUser()` al volver al frente, respetando `sessionContext` y la versión de
   la sucursal activa (una respuesta vieja no pisa una selección nueva). Verificar que, si la activa
   ya no está entre las accesibles, se limpie (`activeBranch` y AsyncStorage). No agregar timers.
4. Sin pantallas nuevas. El listado de transferencias muestra lo que devuelva el backend.

### Validación

- Backend: tests unitarios; instancia QA en 8082 contra `erp_qa` (avisar antes: compilar reinicia
  el backend de IntelliJ). Con un usuario asignado a una sola sucursal, curl de: ajuste en otra
  (403), transferencia desde otra (403), hacia una inactiva (409), listado de transferencias y
  movimientos filtrados, anulación de una transferencia ajena con `TRANSFERIR_STOCK` (200). Desactivar
  una sucursal asignada: pedidos, ajuste y reportes la tratan como no asignada; reactivarla vuelve
  todo.
- Frontend: `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`.

**Pruebas manuales.** Empleado con una sola sucursal: ajusta y transfiere desde la suya; solo ve
transferencias donde participa su sucursal; el historial de stock sigue andando. Admin: desactivar
una sucursal → desaparece del selector de sucursal activa y de Reportes; vender en ella da el mensaje
de sucursal inactiva; reactivarla → vuelve. Editar un producto cambiando solo el stock de la sucursal
activa (ok) con el usuario desasignado de otra sucursal que tiene stock (no debe dar 403). Alta y
edición de pedido, cobro y despacho siguen funcionando.

**Fuera de alcance.** Borrar asignaciones al desactivar; flujo de transferencia en dos pasos;
restringir las lecturas de stock por sucursal.

---

## Etapa 14 — Productos y atributos

Plan detallado el 2026-10-19, relevado contra el código. El bug del detalle lo confirmó el usuario
en la app.

**Arranque.** Crear `feature/products-attributes` desde `feature/branch-access` (la etapa 13 ya
está commiteada).

**Decisiones del usuario (2026-10-19).**
- Bug del detalle: usar los nombres de atributo y valor que el backend ya manda en el producto.
- N+1 de atributos: endpoint nuevo con todos los valores de la empresa.
- El producto trae su propio stock por sucursal en todas las respuestas.
- Productos y atributos siguen en Zustand (la migración a TanStack es otra etapa).

**Lo que hay hoy.**
- **Bug:** `(tabs)/products/[id]/index.tsx:146` arma el nombre de cada valor con
  `product-attribute-store.attributeValues`, que esa pantalla nunca carga; si no se pasó antes por
  Atributos, el formulario de producto, el catálogo de pedidos o Nueva transferencia, muestra el id.
  El backend ya manda `attributes: [{id, attributeId, attributeName, value, ...}]` en cada variante
  (`ProductVariantMapper`), pero `normalizeProduct` (`services/product-service.ts`) se queda solo
  con `attributeId` y `attributeValueId`.
- **N+1:** `product-attribute-store.fetchAttributes` pide `GET /product-attributes` y un
  `GET /product-attributes/{id}/values` por atributo. La consultan Atributos, `ProductForm`,
  `VariantCatalog` y `transfers/new.tsx` (este último solo para armar etiquetas "Color: Rojo").
- **Stock:** `GET /products` y `/products/{id}` devuelven `stock: []` (los arman con
  `ProductVariantMapper.toResponse(variant)` sin stocks); solo la edición devuelve el stock real.
  Por eso `product-store` pide `GET /inventory/stocks` entero en `fetchProducts`,
  `fetchProductById` y `createProduct` y lo mezcla con `mergeProductStocks`; activar/desactivar
  conservan el stock anterior con `preserveExistingProductStocks`. No es N+1 (una request), pero
  trae el stock de todos los productos para mostrar uno.
- La lectura de stock es de toda la empresa (decisión de la etapa 13), así que traerlo en el producto
  no cambia qué ve cada usuario.

### Backend

1. **Stock en las respuestas de producto.** `StockRepository.findByProductVariantIdInAndCompanyId
   (Collection<Long>, Long)` (una consulta para todas las variantes). En `ProductServiceImpl`, un
   helper que arma las respuestas con variantes + stocks agrupados por variante, usado por `findAll`,
   `findById`, `create`, `activate` y `deactivate` (la edición ya lo hace; unificarla con el mismo
   helper). `ProductVariantMapper.toResponse(variant, stocks)` ya existe. Sin consultas por variante:
   `stock.getBranch().getId()` no inicializa la sucursal.
2. **`GET /api/v1/product-attributes/values?active=`** → `List<ProductAttributeValueResponse>` de
   toda la empresa, una consulta con `JOIN FETCH v.attribute` (el mapper usa el nombre del
   atributo), orden por atributo y valor. Mismo permiso que `GET /{id}/values` (lectura). El literal
   `/values` no choca con `/{id}`. `GET /{id}/values` queda (lo usa el detalle de un atributo).
3. **Tests unitarios** (Mockito, `-Dtest=!BackendApplicationTests`): `findAll` de productos pide
   los stocks una sola vez con todas las variantes y los asigna a cada una; activar/desactivar
   devuelven el stock; valores de atributos filtrados por empresa (y por `active` si viene).

### Frontend

1. **Nombres en el producto.** `ProductVariantAttribute` suma `attributeName` y `valueName`
   (opcionales: `ProductForm` arma variantes nuevas solo con ids). `normalizeProduct` los conserva.
2. **Detalle de producto:** muestra `valueName` (o "Atributo: valor") desde el producto y deja de
   leer `product-attribute-store`. Sin request extra.
3. **`transfers/new.tsx`:** las etiquetas "Color: Rojo · Talle: M" salen del producto; se borra su
   `fetchAttributes` propio (el catálogo del modal sigue cargando los atributos al abrirse).
4. **`fetchAttributes`:** `GET /product-attributes` y `GET /product-attributes/values` en paralelo
   (2 requests en total). Función nueva `getAllAttributeValues` en `product-attribute-service`.
5. **`product-store` sin `/inventory/stocks`:** `fetchProducts`, `fetchProductById`,
   `createProduct`, `activateProduct` y `deactivateProduct` usan el stock que viene en la respuesta;
   se borran `mergeProductStocks`, `preserveExistingProductStocks` y el import de `getAllStocks`.
   `stock-store` (Inventario) no cambia. Revisar que `refreshStockAfterTransfer` y el ajuste de
   stock sigan refrescando lo que se ve (relee productos con `fetchProducts`).

### Validación

- Backend: tests unitarios en la copia del scratchpad; QA en 8082 contra `erp_qa` (env
  `JWT_SECRET`; base armada con `pg_dump`). Curl: `/products` con stock por sucursal y igual a
  `/inventory/stocks`; `/product-attributes/values` de la empresa; con `show-sql`, una sola consulta
  de stocks por listado de productos.
- Frontend: `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`.

**Pruebas manuales.** Recargar la app y abrir el detalle de un producto con atributos sin pasar por
otra pantalla: muestra nombres. Atributos y Nuevo producto: en Network, 2 requests de atributos.
Productos: sin `/inventory/stocks`; stock correcto en lista, detalle y catálogo de pedidos. Crear un
producto con stock inicial, editar su stock (también a 0), activarlo/desactivarlo: el stock no se
pierde. Transferir y ajustar: el stock del producto se actualiza. Nueva transferencia muestra las
etiquetas de variantes.

**Fuera de alcance.** Migrar productos/atributos a TanStack Query; que el catálogo de pedidos use
los nombres del producto en lugar del store (necesita todos los valores para elegir).

---

## Etapa 15 — Pedidos a TanStack Query

Plan detallado el 2026-10-19, relevado contra el código.

**Arranque.** Crear `feature/orders-query` desde `feature/products-attributes` (la etapa 14 ya
está commiteada).

**Decisiones del usuario (2026-10-19).**
- Al editar un envío, los productos que ya estaban **conservan el precio con que se vendieron**;
  solo los agregados en la edición toman el precio actual.
- Listado de Operaciones: badge Pagado / Parcial / Pendiente y saldo, con el dato del backend. Sin
  filtro por estado de pago.
- Se descarta la transición CONFIRMED → TO_PREPARE (retiro → envío): se cancela y se crea otro.
- El importe de la venta rápida no se edita: la venta rápida es siempre retiro (`CONFIRMED`) y solo
  se editan pedidos `TO_PREPARE`. La rama QUICK_SALE de `OrderServiceImpl.update` no se alcanza
  (se deja; no es parte de esta etapa).

**Lo que hay hoy.**
- `stores/order-store.ts` (Zustand) guarda **una sola lista** `orders` + paginación. La usan
  `operations/index.tsx` (todos, retiros o envíos de la sucursal activa) y
  `(tabs)/shipments/to-prepare.tsx` (`TO_PREPARE` + `SHIPPING`): cada carga pisa la de la otra, y
  "por preparar" filtra en memoria para no mostrar pedidos ajenos. El detalle sale de la misma
  lista (`hooks/use-order-detail.ts` + `fetchOrderById` con `upsertOrder`).
- Mutaciones en el store: `createOrder` (`orders/new.tsx`, `shipments/new.tsx`), `updateOrder`
  (`shipments/[id]/edit.tsx`), `cancelOrder`/`dispatchOrder` (`hooks/use-order-actions.ts`, desde
  `operations/[id].tsx` y `shipments/[id]/index.tsx`). Sincronizan la cuenta del cliente con
  `invalidateCustomerAccount`. **No refrescan** el stock de `product-store` ni el historial de
  movimientos, aunque mueven stock.
- `use-customer-account-queries.refreshAfterPayment` relee con `fetchOrderById` las órdenes que
  toca un pago, si están en el store.
- `normalizeOrder` descarta `paymentStatus` y `balance`; `OrderInfoCard` los recalcula con
  `getPaymentStatus`/`getBalanceDue`. `OrderCard` (listados) no muestra el pago.
- Filtros sin uso en el store: `searchQuery`, `statusFilter`, `deliveryTypeFilter`,
  `shipmentsSearchQuery`, `shipmentsStatusFilter` y sus setters (ninguna pantalla los lee).
- Backend: `buildItemsFromRequest` arma cada ítem con `variant.getPrice()`, también en la edición.
- `order-draft-store` (borrador de la orden en curso) es estado del cliente: **queda en Zustand**.

### Backend

1. **Precio al editar.** En `OrderServiceImpl.update`, mapa `variantId → unitPrice` de los ítems
   actuales antes de reemplazarlos; `buildItemsFromRequest` recibe ese mapa (vacío en el alta) y
   usa el precio guardado si la variante ya estaba, o `variant.getPrice()` si es nueva. El total se
   recalcula igual que hoy. Cambiar la cantidad de un producto existente mantiene su precio.
2. **Tests** (Mockito, `-Dtest=!BackendApplicationTests`): editar un envío con una variante cuyo
   precio cambió conserva el precio viejo; un producto agregado toma el actual; quitar y volver a
   agregar en la misma edición no aplica (es la misma variante: conserva).

### Frontend

1. **Tipos.** `Order` suma `paymentStatus: PaymentStatus` y `balance: number`; `normalizeOrder` los
   toma del backend (pedidos sin cliente: `PAID` y 0, como ya calcula el backend).
2. **`hooks/use-order-queries.ts`:** `orderKeys` (`all`, `lists()`, `list(params)`, `detail(id)`).
   - `useOrders(params)` con `usePagedList` (tamaño 20, `sort=createdAt,desc`); la clave lleva los
     filtros, así Operaciones y "por preparar" tienen cachés separadas. Deshabilitada sin token.
   - `useOrder(id)` con `useQuery`; si la orden está en alguna página cargada, se usa como
     `placeholderData` para no mostrar un spinner.
   - Mutaciones `useCreateOrder`, `useUpdateOrder`, `useCancelOrder`, `useDispatchOrder`: sembrar
     `detail(id)` con la respuesta, invalidar `lists()`, `invalidateCustomerAccount` si tiene
     cliente, e invalidar movimientos de stock y releer `product-store` si está cargado (sacar de
     `use-transfer-queries` un `refreshStockAfterChange()` compartido y usarlo en los dos).
3. **Pantallas:** `operations/index.tsx` y `shipments/to-prepare.tsx` con `useOrders` (se borra el
   filtro en memoria de "por preparar"); detalles y edición con `useOrder`; `use-order-actions` con
   las mutaciones (misma interfaz para las pantallas); `orders/new` y `shipments/new` con
   `useCreateOrder`. El detalle muestra 404/errores como hoy.
4. **Pagos:** `refreshAfterPayment` invalida `orderKeys.detail` de las órdenes afectadas y
   `orderKeys.lists()` en lugar de `fetchOrderById`.
5. **`OrderCard`:** badge Pagado / Parcial / Pendiente (colores de `OrderInfoCard`) y "Saldo $X"
   si debe. `OrderInfoCard` usa `order.paymentStatus`/`order.balance`; si `getPaymentStatus` y
   `getBalanceDue` quedan sin uso, se borran.
6. **Limpieza:** borrar `stores/order-store.ts`, `hooks/use-order-detail.ts` y los filtros sin
   uso. `clearServerCache()` ya vacía la caché al cambiar de sesión.

### Validación

- Backend: tests unitarios en la copia del scratchpad; QA en 8082 contra `erp_qa`: subir el precio
  de una variante y editar un envío que la tiene (conserva), agregar otra (precio nuevo).
- Frontend: `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`.

**Pruebas manuales (las hace el usuario).** Operaciones: filtros Todos/Ventas/Envíos, scroll
infinito, badge de pago y saldo. Envíos por preparar: solo los `TO_PREPARE` de la sucursal activa,
también después de pasar por Operaciones. Crear venta con y sin cliente, crear envío, editar envío
(precio conservado, producto nuevo con precio actual), despachar y cancelar (con y sin pagos): el
listado y el detalle se actualizan sin recargar, y el stock del catálogo también. Registrar un pago
desde la cuenta del cliente y ver el pedido pasar a Parcial/Pagado. F5 en un detalle de pedido.

**Fuera de alcance.** Filtro por estado de pago; transición retiro → envío; editar ventas
confirmadas; migrar productos y stock a TanStack.

---

## Etapa 16 — Productos y stock a TanStack Query

Plan detallado el 2026-10-20, relevado contra el código.

**Arranque.** Crear `feature/products-query` desde `feature/orders-query` (la etapa 15 ya está
commiteada).

**Decisiones del usuario (2026-10-20).**
- Alcance: productos y stock (`product-store` y `stock-store`) juntos, porque el stock viaja dentro
  del producto. Categorías y atributos quedan para la 17; sucursales, después.
- Listados como el resto de los módulos: **paginados y filtrados en el backend**, con scroll
  infinito (`usePagedList`). Vale para Productos, los selectores de productos (pedidos y
  transferencias) e Inventario.
- Sin sucursal activa, Productos muestra el **stock total** (hoy usa la sucursal `'1'` fija).
- `StockAdjustModal` ajusta solo el stock del detalle, y los límites del borrador salen de
  `useVariantStock` (confirmado). Los bugs relevados abajo se corrigen en esta etapa.

**Lo que hay hoy.**
- `GET /products` devuelve la lista entera; Productos, el selector de pedidos y el alta de
  transferencias filtran en memoria. Cuatro pantallas piden el catálogo completo al abrir.
- `product-store` mezcla datos del servidor con filtros de pantalla: `searchQuery` lo comparten
  Productos y el selector de pedidos (buscar en uno filtra el otro). `isLoading` es uno solo para
  la carga y las mutaciones.
- El detalle y la edición de producto solo piden el producto si no está en el store: la edición
  puede partir de un stock viejo y, como manda cantidades finales, pisar una venta reciente.
- `OrderForm` y el alta de transferencias toman el límite de stock de cada ítem del catálogo
  cargado. **Bug:** si el catálogo no está cargado, o al editar un envío cuyo stock restante es 0,
  tocar +/- **saca el ítem del pedido** (`updateItemQuantity` lo borra con `maxStock <= 0`). Al
  editar, el límite tampoco suma lo que el propio pedido ya tiene reservado.
- `stock-store`: Inventario pide `/inventory/stocks/branch/{id}` entero y busca en memoria. El
  ajuste no refresca el catálogo ni el detalle de producto. `StockAdjustModal`, que se abre desde
  el detalle de un stock, ofrece elegir **cualquier** variante del catálogo y cualquier sucursal.
- `refreshStockAfterChange` relee `product-store` entero tras pedidos y transferencias.

### Backend

1. **`GET /api/v1/products` paginado** (`PageResponse<ProductResponse>`, como clientes):
   `q` (nombre o SKU de alguna variante, sin distinguir mayúsculas ni tildes, con el mismo
   `translate()` de `CustomerRepository`), `categoryId`, `active`, `stock` (`IN_STOCK` /
   `OUT_OF_STOCK`) con `branchId` opcional (sin `branchId`, el total de las sucursales que trae la
   respuesta), `page`, `size` (máx. 100), `sort` (`name,asc` por defecto). Categoría con
   `@EntityGraph` y una consulta de variantes y otra de stocks **por página**, como hoy.
2. **`GET /api/v1/inventory/stocks` paginado** con `branchId`, `q` (producto o SKU) y
   `variantIds` (lista; para pedir el stock de los ítems de un borrador). Las rutas
   `/branch/{id}` y `/variant/{id}` quedan sin uso en el frontend; se dejan.
3. **Tests** (Mockito): validación de `page`/`size`/`sort`, armado de la página con stock; las
   consultas se prueban en QA.

### Frontend

1. **`hooks/use-product-queries.ts`:** `productKeys` (`all`, `lists()`, `list(filters)`,
   `detail(id)`).
   - `useProducts(filters)` con `usePagedList`; búsqueda con `useDebouncedValue`. Deshabilitada sin
     token.
   - `useProduct(id, { fresh })` con placeholder desde los listados, como `useOrder`; la edición
     usa `fresh`.
   - Mutaciones: alta, edición, activar y desactivar. Siembran el detalle, invalidan listados,
     stock y movimientos (la edición registra ajustes).
2. **`hooks/use-stock-queries.ts`:** `stockKeys`; `useBranchStocks({ branchId, q })` (Inventario),
   `useStock(id)` con placeholder, `useVariantStock(branchId, variantIds)` y `useAdjustStock`
   (siembra el stock e invalida stock, productos y movimientos).
3. **`refreshStockAfterChange`** pasa a invalidar `productKeys.all`, `stockKeys.all` y los
   movimientos (deja de depender de `product-store`).
4. **Pantallas:**
   - Productos: filtros en estado local y en la query; stock de la sucursal activa o total.
   - Detalle y edición de producto con `useProduct`; alta con la mutación.
   - Inventario e historial con `useBranchStocks`/`useStock`.
   - `VariantCatalog` recibe la página (`useProducts({ active: true, stock: 'IN_STOCK', branchId, q })`)
     y scroll infinito; en el selector de pedidos y en transferencias se vuelve a pedir al abrir
     (stock al día). La búsqueda pasa a estado local de cada pantalla.
5. **Límites de stock del borrador:**
   - `OrderForm` y el alta de transferencias usan `useVariantStock` para los ítems del borrador.
   - Al editar, el límite es el stock de la sucursal más lo que el pedido ya tenía de esa
     variante.
   - `updateItemQuantity` deja de borrar el ítem cuando el límite es 0: solo lo saca la cantidad 0
     o el botón quitar.
6. **`StockAdjustModal`** ajusta el stock del detalle (variante y sucursal fijas, a la vista); deja
   de recibir el catálogo y las sucursales.
7. **Limpieza:** borrar `stores/product-store.ts`, `stores/stock-store.ts`, `getAllProducts`,
   `getStocksByBranch`/`getStocksByVariant`/`getAllStocks` si quedan sin uso, y los tipos
   `StockFilter`/`StatusFilter` si pasan a la pantalla.

### Validación

- Backend: tests unitarios en la copia del scratchpad. QA en 8082 contra `erp_qa`:
  - filtros y paginación de `/products` y `/inventory/stocks`;
  - cantidad de consultas por página (la de stocks es una sola).
- Frontend: `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`.

**Pruebas manuales (las hace el usuario).**
- Productos: búsqueda por nombre y por SKU, categoría, estado, con/sin stock, scroll infinito;
  sin sucursal activa, el stock es el total.
- Selectores: el de pedidos y el de transferencias no comparten la búsqueda con Productos.
- Edición de producto: cambiar el stock después de una venta hecha en otra pestaña parte del
  stock nuevo.
- Formulario de pedido y transferencias:
  - +/- respeta el stock;
  - al editar un envío con stock restante 0 se puede bajar la cantidad sin que se borre el ítem;
  - se puede volver a la cantidad original.
- Inventario: búsqueda y scroll infinito; ajustar desde el detalle actualiza el listado, el
  catálogo y el detalle de producto sin recargar.
- Vender, transferir y cancelar: el stock de Productos e Inventario se actualiza.
- F5 en el detalle de producto y de stock.

**Fuera de alcance.** Categorías y atributos (etapa 17), sucursales, control de concurrencia en
la edición de stock (versión u "esperado" en el request).

## Etapa 17 — Categorías y atributos a TanStack Query; avisos y confirmaciones propios

Plan detallado el 2026-10-20, relevado contra el código.

**Arranque.** Crear `feature/catalog-feedback` desde `feature/products-query` (la etapa 16 ya está
commiteada).

**Decisiones del usuario (2026-10-20).**
- Categorías y atributos van como **lista completa** (una query por catálogo, sin paginar): son
  catálogos chicos y los selectores los necesitan enteros. Mismo esquema TanStack que el resto.
- Se cierra el pendiente de `Alert.alert` (mudo en web) **reemplazándolo en toda la app** por
  componentes propios que se vean bien en web y en el celular: toasts para avisos y un diálogo para
  confirmaciones.
- El selector de categoría del formulario de producto **oculta las inactivas** (al editar, la
  actual se sigue viendo, marcada como inactiva).

**Lo que hay hoy.**
- `category-store` y `product-attribute-store` (Zustand) con un `isLoading`/`error` compartido
  entre la carga y las mutaciones. Renombrar una categoría o un atributo no refresca los productos
  en caché (traen `categoryName`, `attributeName` y `valueName`).
- Atributos: activar/desactivar **traga el error** (`catch {}` con un comentario que dice que lo
  muestra el store, y no lo hace).
- `ProductSelectionCard` (selectores de pedidos y transferencias) busca los nombres de atributo en
  el store y, si no está cargado, muestra "Atributo" y el id del valor; el producto ya trae los
  nombres. `VariantCatalog` pide los atributos solo para eso.
- El selector de categoría (`CategoryModal`) lista también las inactivas; elegir una da
  `CATEGORY_INACTIVE` al guardar.
- `Alert.alert` para errores en 5 lugares (detalle de producto, Categorías, Sucursales ×2,
  `BranchUsersAssignmentModal` ×2): en web no se ve nada.
- Confirmaciones: `confirmAction` (7 pantallas) usa `window.confirm` en web; la cancelación de un
  pedido con pagos usa `window.confirm` con "Aceptar = reembolsar, Cancelar = crédito".
- Éxitos: Operaciones y Envíos muestran `SuccessBanner` y lo esconden con `setTimeout`; el alta y
  la edición de producto guardan un mensaje de éxito justo antes de `router.back()` (nunca se ve).
- `getCategoryById` y `fetchCategoryById` sin uso.

### Backend

Sin cambios: `GET /categories`, `GET /product-attributes` y `GET /product-attributes/values` ya
devuelven las listas completas.

### Frontend

1. **`hooks/use-category-queries.ts`:** `categoryKeys` (`all`, `list()`); `useCategories()` con
   todas (las pantallas filtran activas donde corresponde); mutaciones alta, edición y
   activar/desactivar que actualizan la lista e invalidan `productKeys.all` (nombre de categoría en
   los productos y filtro por categoría).
2. **`hooks/use-attribute-queries.ts`:** `attributeKeys` (`all`, `list()`, `values()`); `useAttributes()`
   (atributos y valores en paralelo, como hoy); el detalle deriva de esas listas. Mutaciones de
   atributo y de valor (alta, edición, activar/desactivar) que actualizan las listas e invalidan
   `productKeys.all`. Errores visibles (toast).
3. **Pantallas:** Categorías, Atributos y detalle de atributo con los hooks; Productos (pastillas)
   y `ProductForm` con `useCategories`/`useAttributes`; `CategoryModal` solo activas (más la actual
   al editar). `ProductSelectionCard`/`VariantCatalog` usan los nombres que trae el producto y dejan
   de pedir atributos.
4. **Avisos (toasts):** `stores/toast-store.ts` (estado de la UI, Zustand) y `components/ui/ToastHost.tsx`
   montado una vez en `src/app/_layout.tsx`; `showToast({ type: 'success' | 'error' | 'info', message })`.
   Arriba, respetando el área segura; se apilan hasta 3; se cierran solos (éxito 3 s, error 5 s)
   o al tocarlos; animación con Reanimated (ya instalado). Sin librerías nuevas, así se ve igual en
   web, iOS y Android. Se vacían al cerrar o expirar la sesión.
5. **Confirmaciones (diálogo):** `components/ui/DialogHost.tsx` + estado propio, también en el layout
   raíz. `confirmAction` mantiene su firma (las 7 pantallas no cambian) y pasa a usar el diálogo en
   todas las plataformas; `chooseAction({ title, message, options })` para la cancelación con pagos
   (Volver / Dejar como crédito / Reembolsar). Uno a la vez; al expirar la sesión se resuelven como
   cancelados. El overlay de sesión expirada queda siempre por encima.
6. **Reemplazos:** los `Alert.alert` de error pasan a `showToast` (y Atributos deja de tragar el
   error); `SuccessBanner` + `setTimeout` y los mensajes de éxito que nunca se veían pasan a
   `showToast` de éxito; `use-order-actions` usa `chooseAction`. Se borran `SuccessBanner`,
   `category-store`, `product-attribute-store` y `getCategoryById`.

### Validación

- Frontend: `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`.
- No hay cambios de backend.

**Pruebas manuales (las hace el usuario), en web y en el celular.**
- Categorías: crear, editar, activar/desactivar; el nuevo nombre aparece en Productos sin
  recargar. El formulario de producto no ofrece inactivas (salvo la actual al editar).
- Atributos: crear atributo y valor, renombrar, activar/desactivar (también con error: se ve el
  aviso); F5 en el detalle.
- Selectores de pedidos y transferencias: los atributos se ven con su nombre sin haber pasado por
  Atributos.
- Toasts: error al activar una sucursal o categoría, éxito al despachar/cancelar un pedido y al
  guardar un producto; se apilan y se cierran solos o al tocarlos.
- Diálogos: confirmar desactivar sucursal/usuario/rol, anular pago o transferencia; cancelar un
  pedido con pagos (las tres opciones). Logout y sesión expirada con un diálogo o toast abierto.

**Fuera de alcance.** Sucursales a TanStack (próxima migración), mensajes de éxito nuevos donde hoy
no hay ninguno.

## Etapa 18 — Sucursales a TanStack Query; Mi Perfil y limpieza

Plan detallado el 2026-10-20, relevado contra el código.

**Arranque.** Crear `feature/branches-query` desde `feature/catalog-feedback` (la etapa 17 ya está
commiteada).

**Decisiones del usuario (2026-10-20).**
- Sucursales es la última migración a TanStack Query; con ella no quedan datos del servidor en
  Zustand.
- "Mi Perfil" pasa a ser una pantalla de solo lectura.
- Se **prohíbe el precio $0** en las variantes (backend y formulario): así un pedido no puede
  quedar en $0 y figurar "Pendiente". Las variantes que ya estén en $0 se siguen pudiendo vender
  hasta que se editen.
- Migraciones (Flyway) y el test de contexto **no** entran: en desarrollo alcanza con
  `ddl-auto: update`; quedan como pendiente "antes de producción".

**Lo que hay hoy.**
- `branch-store` (402 líneas) mezcla estado del cliente —la sucursal activa, guardada en
  AsyncStorage por usuario y empresa, con guardas de versión y de sesión— con dos listas del
  servidor: `availableBranches` (las asignadas y activas del usuario) y `allBranches` (las de la
  empresa), cada una con su `fetch`, `isLoading`/`error` compartidos y `hasFetchedUserBranches`.
- `activeBranch` es una copia: al renombrar o desactivar una sucursal, `updateBranch` y
  `toggleBranchActive` tienen que reemplazarla a mano en las tres listas.
- `(app)/_layout` pide las sucursales del usuario al entrar y otra vez al volver al frente con un
  `AppState` propio; Inventario y Reportes también las piden si no están.
- `BranchUsersAssignmentModal` carga usuarios con `fetch` propio y un contador de requests para
  descartar respuestas viejas; `use-user-queries` ya tiene `useCompanyUsers`.
- "Mi Perfil" en Más no hace nada. `getBranchById`, `OrdersFilterList` (y `OrderStatusFilter` /
  `OrderDeliveryFilter`) sin uso; `FRONTEND_DOCS.md` describe un dashboard y un login mock que ya no
  existen; la clave vieja `@erp/active-branch-id` puede seguir en AsyncStorage.

### Backend

1. **Precio mayor a 0:** `@DecimalMin(value = "0.0", inclusive = false)` en `ProductVariantRequest`,
   `ProductVariantUpdateRequest` y la entidad; mensaje en español en el frontend.
2. **Tests:** validación del precio 0 en alta y edición.

### Frontend

1. **`hooks/use-branch-queries.ts`:** `branchKeys` (`all`, `mine(userId)`, `list()`).
   - `useMyBranches()`: las asignadas y activas del usuario (reemplaza `availableBranches`,
     `fetchUserBranches` y `hasFetchedUserBranches`). El refresco al volver al frente lo hace
     TanStack: se borra el `AppState` de sucursales de `(app)/_layout` (el de `refreshUser` queda).
   - `useBranches()`: las de la empresa (Sucursales, destino de transferencias, ficha del usuario).
   - Mutaciones: alta, edición, activar/desactivar, asignar/quitar usuario y "elegir y asignarme"
     (`selectAndEnsureAssigned`). Invalidan sucursales, las sucursales del usuario afectado y,
     al desactivar, pedidos y reportes (dejan de verse los de esa sucursal).
2. **`branch-store` queda solo con estado del cliente:** `activeBranchId`, la persistencia por
   usuario y empresa, el contexto de sesión y la versión de selección. `useActiveBranch()` deriva la
   sucursal de `useMyBranches()` por id, así un renombre o una desactivación se ven solos.
   Un único `useActiveBranchSync()` en `(app)/_layout`: cuando llega la lista, si la elegida ya no
   está (desactivada o desasignada) restaura la guardada del mismo usuario y empresa o toma la
   primera; una selección manual hecha mientras tanto manda (misma guarda de versión que hoy).
3. **Pantallas:** las 12 que leen `activeBranch` pasan a `useActiveBranch()`; Reportes, Inventario,
   Sucursales, Sucursal activa, transferencias, ficha del usuario y `BranchFormModal` a los hooks.
   `BranchUsersAssignmentModal` usa `useCompanyUsers`, una query de usuarios de la sucursal y la
   mutación con actualización optimista y vuelta atrás solo si falla (los `201`/`204` sin body
   siguen siendo éxito).
4. **Mi Perfil** (`settings/profile.tsx`): nombre, email, rol, empresa, sucursales asignadas y
   sucursal activa, con accesos a Sucursal activa y Cambiar contraseña (si puede). Sale de
   `/auth/me` (`refreshUser`); sin endpoints nuevos.
5. **Precio:** `ProductForm` exige precio mayor a 0.
6. **Limpieza:** borrar `getBranchById`, `OrdersFilterList` y sus tipos, `FRONTEND_DOCS.md`
   (la referencia es `AGENTS.md` y este plan) y la clave `@erp/active-branch-id` al hidratar.
   Actualizar en `AGENTS.md` las secciones de arquitectura y sucursales al esquema nuevo.

### Validación

- Backend: tests unitarios en la copia del scratchpad.
- Frontend: `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`.

**Pruebas manuales (las hace el usuario).**
- Entrar: se restaura la sucursal activa guardada; con otro usuario o empresa no se reutiliza.
- Cambiar la sucursal activa: se actualiza todo y persiste tras recargar; una carga vieja no
  la pisa.
- Renombrar la sucursal activa: el nombre nuevo se ve en el encabezado sin recargar.
- Desactivar la sucursal activa o quitarse a uno mismo de ella: deja de ser la activa.
- Asignar/quitar usuarios en el modal: el switch queda bien; si falla, vuelve y se ve el error.
- Volver al frente después de que otro admin cambió las asignaciones: se actualizan.
- Logout, sesión expirada y volver a entrar.
- Mi Perfil. Producto con precio 0: no se puede guardar.

**Fuera de alcance.** Migraciones y test de contexto (antes de producción); acceso a deudas desde
el detalle del cliente.

## Etapa 19 — Permiso de precios y deudas desde el cliente

Plan detallado el 2026-10-20, relevado contra el código.

**Arranque.** Crear `feature/prices-debts` desde `feature/branches-query` (la etapa 18 ya está
commiteada: 46b45fa backend, 02adf93 frontend).

**Decisiones del usuario (2026-10-20).**
- Los pendientes chicos se resuelven en una etapa corta.
- `ADMINISTRAR_PRECIOS` **se aplica**: para dar de alta una variante o cambiar el precio de una
  existente hace falta `ADMINISTRAR_PRODUCTOS` **y** `ADMINISTRAR_PRECIOS`. Sin el segundo se puede
  editar el resto del producto, pero el precio queda bloqueado y el backend rechaza cambiarlo.

**Lo que hay hoy.**
- `ADMINISTRAR_PRECIOS` está en el enum `Permission` y en `permission-labels.ts` ("Todavía sin efecto
  en la app"); ningún endpoint ni pantalla lo chequea. `ProductController` solo pide
  `ADMINISTRAR_PRODUCTOS` en alta, edición, activar y desactivar; `ProductServiceImpl.create` /
  `update` toman el precio de cada variante sin mirar permisos.
- `customers/[id]/debts.tsx` (pendientes, movimientos y anular pagos) solo se abre desde
  `debtors.tsx`. El detalle del cliente (`customers/[id]/index.tsx`) no muestra su saldo ni enlaza a
  la cuenta. Los endpoints `/customers/{id}/account*` piden `ADMINISTRAR_CLIENTES`, `CREAR_PEDIDOS`,
  `REGISTRAR_PAGOS` o `VER_REPORTES`; `DEBTORS_READ_PERMISSIONS` (para `/debtors`) es más estricto.

### Backend

1. **Precio con permiso.** En `ProductServiceImpl`, al **crear** (cada variante nueva trae precio) y
   al **actualizar** (variante nueva, o variante existente cuyo precio cambia), exigir
   `ADMINISTRAR_PRECIOS`; si falta, `AccessDeniedException` (el handler ya responde 403 con código
   `FORBIDDEN`). Si el precio enviado es igual al actual no cuenta como cambio, así el formulario
   puede reenviar todo sin que falle. Comprobación con un helper chico (por ejemplo
   `SecurityUtils.hasAuthority`), sin tocar `@PreAuthorize`.
2. **Tests:** crear sin el permiso → 403; editar el nombre con el mismo precio sin el permiso → ok;
   cambiar el precio sin el permiso → 403; con el permiso → ok.
3. **Roles existentes.** `ddl-auto: update` no agrega permisos a roles ya guardados: el ADMIN creado
   por el aprovisionamiento ya los tiene todos (relevar `ProvisioningServiceImpl`); los roles
   personalizados se actualizan desde la pantalla de roles.

### Frontend

1. **Permiso:** `hasPermission(user, 'ADMINISTRAR_PRECIOS')` en `ProductForm` (la pantalla ya exige
   `ADMINISTRAR_PRODUCTOS`): sin él, el campo precio de las variantes existentes queda de solo
   lectura y el alta de una variante nueva avisa que hace falta el permiso; la pantalla de producto
   nuevo pide ambos. En `permission-labels.ts`, quitar el "Todavía sin efecto" y describir lo que
   hace. Mostrar el error 403 en el formulario si llega igual.
2. **Deudas desde el cliente:** en el detalle, una tarjeta "Cuenta corriente" con el saldo (de
   `useCustomerAccountSummaryQuery`) y el acceso a `customers/[id]/debts`, visible si el usuario
   tiene alguno de los permisos de `/account` (nuevo `CUSTOMER_ACCOUNT_READ_PERMISSIONS` en
   `utils/permissions.ts`). La navegación queda dentro del stack de clientes (sin cruzar stacks).
3. **AGENTS.md:** en la sección de productos, regla del precio y su permiso.

### Validación

- Backend: tests unitarios en la copia del scratchpad.
- Frontend: `npx tsc --noEmit`, eslint de los archivos tocados, `git diff --check`.

**Pruebas manuales (las hace el usuario).**
- Con un rol sin `ADMINISTRAR_PRECIOS`: editar nombre, categoría o stock de un producto sí; el precio
  está bloqueado; crear un producto no deja (o avisa). Con el permiso: todo igual que hoy.
- Reiniciar el backend en IntelliJ (Rebuild) antes de probar.
- Detalle de un cliente con deuda: aparece el saldo y lleva a la cuenta; volver deja en el cliente.
- Un usuario sin ninguno de los permisos de cuenta no ve la tarjeta.

**Fuera de alcance.** Migraciones, índice de `lower(username)` y test de contexto (antes de
producción).

---

## Pendientes chicos (sin orden; sumar a la etapa afín)

- (Etapa 19) Acceso a deudas desde el detalle del cliente y permiso `ADMINISTRAR_PRECIOS`.
- **Antes de producción** (decisión del usuario: en desarrollo alcanza con `ddl-auto: update`):
  - Migraciones (Flyway con línea base del esquema actual): `ddl-auto: update` no crea índices
    funcionales ni actualiza los CHECK de los enums (por eso la etapa 10 no pudo sumar un tipo de
    movimiento).
  - Unicidad de usuario sin distinguir mayúsculas: hoy solo en el servicio; con migraciones,
    índice único sobre `lower(username)`.
  - `BackendApplicationTests` (test de contexto) falla desde 2026-10-06; los unitarios se corren
    con `-Dtest=!BackendApplicationTests`.
