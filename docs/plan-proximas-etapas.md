# Plan de las etapas que quedan

Estado al 2026-10-17, rama `feature/users-roles`. Para retomar: pasarle este archivo a Claude y
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

---

## Mapa de integración (relevado el 2026-10-14; transferencias, usuarios y roles ya conectados en las etapas 8 y 9)

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

- Frontend: branch, category, product, product-attribute y stock-service muestran el `message` del
  backend en inglés. Mapear por `code` como `order-service` (y revisar el fallback de `order-service`,
  que también lo muestra). Evaluar un helper común en `api-client.ts`.
- Backend:
  - `CompanyTaxIdAlreadyExistsException` no está en `GlobalExceptionHandler` → 500 en vez de 409.
  - Sin handler para `MethodArgumentTypeMismatchException`: `?status=FOO` da 500 en vez de 400.
  - Sin `code`: los `*AlreadyExists` (409), los 404 y `ProductCategoryNotActiveException`.

---

## Etapa 12 — Dashboard / reportes

No hay nada en ningún lado. Antes de codear, definir las métricas (ventas por período y sucursal, deuda
total, stock bajo, ...). Después: endpoints con `VER_REPORTES` y pantalla. Borrar
`src/data/mock-dashboard.ts` (sin uso).

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
- Permisos que el backend nunca chequea: `ADMINISTRAR_PRECIOS` y `ACCEDER_TODAS_SUCURSALES`.
- Transferencias: el backend no valida que el usuario esté asignado a la sucursal de origen ni que
  origen/destino estén activas.
- `BackendApplicationTests` (test de contexto) falla desde 2026-10-06; los unitarios se corren con
  `-Dtest=!BackendApplicationTests`.
