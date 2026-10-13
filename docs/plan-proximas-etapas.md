# Plan de las etapas que quedan

Estado al 2026-10-13, rama `feature/customers-api`. Etapas 1 a 4 de clientes terminadas y commiteadas.
Para retomar: pasarle este archivo a Claude y elegir la etapa.

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

---

## Etapa 5 — Dirección de envío persistida

**Problema.** El pedido con envío elige una dirección del cliente, pero nunca la manda: el backend no
guarda dónde se entrega. `OrderResponse` no trae dirección, así que `OrderInfoCard` nunca la muestra
para pedidos reales.

**Lo que ya existe en el backend.**
- `Shipment` (1:1 con `Order`, unique `order_id`): snapshot de la dirección
  (street, number, apartment, floor, city, state, postalCode, **country NOT NULL**, reference).
- `POST/GET/PATCH /api/v1/orders/{orderId}/shipment`: crear y editar solo en `TO_PREPARE`.

**Decisiones a tomar antes de arrancar.**
1. **Transacción única (recomendado):** `OrderRequest.shippingAddressId` y el backend crea el
   `Shipment` dentro del mismo `create`. La otra opción es que el frontend llame `POST /shipment`
   después del alta, pero si esa segunda llamada falla queda un pedido sin dirección.
2. **`country`:** en `Address` es opcional y en `Shipment` obligatorio. Opciones: default
   `"Argentina"` al copiar, o volver nullable la columna (con `ddl-auto` hay que hacer
   `ALTER TABLE ... DROP NOT NULL` a mano y documentarlo).
3. ¿Se puede cambiar la dirección de un pedido ya creado (mientras está `TO_PREPARE`)?
   El backend ya lo permite con `PATCH /shipment`.

**Backend.**
- `OrderRequest.shippingAddressId` (Long, opcional). Validar: obligatorio si `deliveryType = SHIPPING`,
  prohibido si es `LOCAL_PICKUP`; la dirección debe ser **del cliente del pedido**, **activa** y de la
  misma empresa (400 con código propio, p. ej. `INVALID_SHIPPING_ADDRESS`).
- Crear el `Shipment` copiando los campos de la dirección (snapshot: si después editan la dirección del
  cliente, el pedido conserva la original).
- `OrderResponse.shipment` (o `shippingAddress`) con el snapshot, para detalle y listados.
- **Seguridad:** `ShipmentServiceImpl.findOrderOrThrow` solo filtra por empresa; no verifica que el
  usuario esté asignado a la sucursal del pedido (`OrderServiceImpl` sí lo hace). Igualarlo.
- Tests unitarios de la validación y E2E: alta con dirección, dirección de otro cliente, inactiva,
  `LOCAL_PICKUP` con dirección, editar la dirección del cliente y ver que el pedido no cambia.

**Frontend.**
- `utils/order-request.ts`, `orders/new.tsx` y `shipments/new.tsx`: mandar `shippingAddressId` del borrador
  (hoy hay un comentario en `shipments/new.tsx` que dice que todavía no se envía).
- `order-service`: normalizar el snapshot a un tipo propio (no reutilizar `CustomerAddress`, que tiene
  `isMain`/`active`), y `OrderInfoCard` lo muestra con `formatAddress`.
- `order-draft-store.initEditOrder`: hoy toma `order.address`; pasar al snapshot.
- Mensaje en español para el código nuevo en `order-service`.
- Si se decide editar la dirección de un pedido existente: pantalla que reutilice `SelectAddressScreen`
  dentro del mismo stack.

**Pruebas manuales.** Crear envío con dirección, verla en el detalle; editar la dirección del cliente y
confirmar que el pedido mantiene la vieja; venta en local sin dirección.

---

## Etapa 6 — Cuenta corriente y pagos reales

**Problema.** `customers/[id]/debts.tsx` y `RegisterCustomerPaymentModal` calculan deuda, pagos y
asignaciones en el frontend con `customer-account-store` (persistido localmente y sembrado con
`data/mock-orders.ts`). El backend ya hace todo eso.

**Lo que ya existe en el backend.**
- `GET /api/v1/customers/{id}/account` → `{ balance, debt, credit, pendingOrders }` (ya usado por
  `useCustomerAccountSummary`).
- `GET /api/v1/customers/debtors` (ya usado por `debtors.tsx`).
- `GET /api/v1/orders?customerId=&paymentStatus=PENDING|PARTIAL` → pedidos con `total`, `amountPaid`,
  `balance`, `paymentStatus`.
- `POST /api/v1/payments` `{ customerId, branchId, amount, method }`: asigna FIFO en el backend.
  `GET /api/v1/payments?customerId=`, `PATCH /api/v1/payments/{id}/cancel`.
- Permiso `REGISTRAR_PAGOS`.

**Plan.**
1. `services/payment-service.ts` (createPayment, listPayments, cancelPayment) y tipos.
2. `hooks/use-customer-account-queries.ts` con TanStack: resumen de cuenta, pedidos pendientes del
   cliente, pagos del cliente; mutaciones que invalidan cuenta, pendientes, deudores y el detalle del
   cliente. Migrar `useCustomerAccountSummary` y `debtors.tsx` a estas claves.
3. Reescribir `debts.tsx`: pedidos pendientes desde el backend (ya traen `balance`), total desde
   `/account`, historial de pagos, botón "Registrar pago" solo con `REGISTRAR_PAGOS`.
4. `RegisterCustomerPaymentModal`: llamar a `POST /payments` con la sucursal activa; mostrar las
   asignaciones que devuelve el backend en lugar de calcularlas.
5. Cancelar pago (con `confirmAction`), si se decide exponerlo.
6. `order-draft-store.initEditOrder`: usar `order.amountPaid` del backend en vez de
   `useCustomerAccountStore.getOrderPaidAmount`.
7. Borrar `customer-account-store.ts`, `utils/customer-account.ts` (si no queda uso),
   `data/mock-orders.ts` y su persistencia en AsyncStorage (limpiar la clave vieja una vez).

**Decisiones a tomar.** ¿Se permite cancelar pagos desde la app? ¿Se muestra el historial de
movimientos de la cuenta (cargos, pagos, ajustes por edición) o solo pendientes y pagos?

**Pruebas.** Pago parcial y total (FIFO entre dos pedidos), pago mayor a la deuda (queda saldo a
favor), cancelar pago, editar un pedido y ver el ajuste en la cuenta, deudores coherente con el detalle.

---

## Pendientes técnicos (tanda aparte, sin orden fijo)

- **Tipo `Permission` del frontend** (`types/auth.ts`): usa nombres inventados (`PRODUCTS_CREATE`,
  ...) que no coinciden con los del backend (`ADMINISTRAR_CLIENTES`, `CREAR_PEDIDOS`, ...).
  `hasPermission` recibe `string` para esquivarlo. Reemplazarlo por la lista real del backend.
- **Migrar a TanStack Query** los demás módulos (productos, categorías, atributos, stock, pedidos),
  de a uno y con decisión explícita. Pedidos es el que más se beneficia (listados por pestaña,
  detalle, invalidación tras editar/cancelar/despachar).
- **Mocks sin uso**: `data/mock-dashboard.ts` y `data/mock-user.ts` no se importan desde ningún lado;
  el dashboard sigue sin datos reales.
- **Mensajes de error del backend en inglés** que llegan tal cual a la UI (productos, por ejemplo
  `INVALID_PRODUCT_VARIANTS`): mapear por `code` como ya hace `order-service`.
- **Precio al editar un pedido**: al editar, los ítems toman el precio actual de la variante (no el
  del momento de la venta). Confirmar si es lo deseado.
- `BackendApplicationTests` (test de contexto): su último reporte (2026-10-06) es un fallo y no se
  volvió a correr; los tests unitarios se corren excluyéndolo (`-Dtest=!BackendApplicationTests`).
