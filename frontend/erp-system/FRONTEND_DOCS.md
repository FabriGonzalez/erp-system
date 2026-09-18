# Frontend Documentation - ERP System

## 1. Overview

ERP multi-tenant construido con **React Native + Expo SDK 57** y **Expo Router v57** (file-based routing). Gestiona productos (con variantes y stock por sucursal), clientes, direcciones y pedidos con flujo de estados.

- **Framework:** React Native 0.86.3 + Expo ~57.0.18
- **Routing:** Expo Router ~57.0.17 (file-based)
- **State Management:** Zustand 5.x (stores globales)
- **UI Library:** expo-symbols, expo-glass-effect, react-native-reanimated
- **TypeScript:** ~6.0.3 (strict mode)
- **Entry Point:** `expo-router/entry` → `src/app/_layout.tsx`

**No hay backend real ni servicios API.** Todos los datos provienen de mocks hardcodeados en `src/data/`. Las operaciones CRUD y los "requests" se simulan con `setTimeout` en los stores de Zustand.

---

## 2. Project Structure

```
erp-system/
├── src/
│   ├── app/                          # Expo Router - file-based routing
│   │   ├── _layout.tsx               # Root layout (Stack sin headers)
│   │   ├── index.tsx                 # Entry redirect (auth check)
│   │   ├── (auth)/
│   │   │   ├── _layout.tsx           # Auth guard (redirección automática)
│   │   │   └── login.tsx             # Login screen
│   │   └── (app)/
│   │       ├── _layout.tsx           # App layout (SafeAreaView + AppHeader)
│   │       ├── settings/
│   │       │   └── active-branch.tsx # Selector de sucursal activa
│   │       ├── customers/
│   │       │   ├── _layout.tsx       # Stack navigator
│   │       │   ├── index.tsx         # Lista de clientes
│   │       │   ├── new.tsx           # Crear cliente
│   │       │   ├── debtors.tsx       # Clientes con deuda
│   │       │   └── [id]/
│   │       │       ├── index.tsx     # Detalle cliente
│   │       │       ├── debts.tsx     # Deudas del cliente
│   │       │       └── add-address.tsx
│   │       └── (tabs)/
│   │           ├── _layout.tsx       # Tab navigator (4 tabs)
│   │           ├── index.tsx         # Home/Dashboard
│   │           ├── more.tsx          # Más (perfil, settings)
│   │           ├── orders/
│   │           │   ├── _layout.tsx   # Stack navigator
│   │           │   ├── index.tsx     # Lista de pedidos
│   │           │   ├── new.tsx       # Crear pedido
│   │           │   ├── new-customer.tsx
│   │           │   ├── add-address.tsx
│   │           │   ├── select-customer.tsx
│   │           │   ├── select-address.tsx
│   │           │   ├── select-products.tsx
│   │           │   └── [id]/
│   │           │       ├── index.tsx # Detalle pedido
│   │           │       └── edit.tsx  # Editar pedido
│   │           └── products/
│   │               ├── _layout.tsx   # Stack navigator
│   │               ├── index.tsx     # Lista de productos
│   │               ├── new.tsx       # Crear producto
│   │               └── [id]/
│   │                   ├── index.tsx # Detalle producto
│   │                   └── edit.tsx  # Editar producto
│   ├── components/
│   │   ├── ui/                       # Componentes genéricos reutilizables (14)
│   │   ├── app/                      # Header de la app (1)
│   │   ├── orders/                   # Componentes de pedidos (16)
│   │   ├── products/                 # Componentes de productos (6)
│   │   ├── customers/                # Componentes de clientes (3)
│   │   ├── BranchCard.tsx            # Tarjeta de sucursal (sin uso activo)
│   │   ├── BranchSelector.tsx        # Selector de sucursal (sin uso activo)
│   │   ├── QuantitySelector.tsx      # Selector +/- (sin uso activo)
│   │   └── animated-icon.module.css
│   ├── stores/                       # Zustand stores (6)
│   ├── types/                        # TypeScript types/interfaces (5)
│   ├── data/                         # Mock data (5)
│   ├── constants/                    # Colors, Spacing, Typography (3)
│   ├── utils/                        # format.ts, status.ts (2)
│   ├── styles/                       # shared.ts (1)
│   └── hooks/                        # use-color-scheme (2 variants)
├── assets/                           # Imágenes, iconos, splash
├── package.json
├── tsconfig.json
└── app.json
```

**Total archivos fuente:** ~72 archivos TypeScript/TSX en `src/`

---

## 3. Architecture

### Patrón general

```
Screen (src/app/) 
  → Componentes UI (src/components/)
    → Zustand Stores (src/stores/)
      → Mock Data (src/data/)
```

- **No hay capa de servicios/API.** No existen llamadas HTTP, fetch, axios ni similar.
- **No hay Context API.** Todo el estado global se maneja con Zustand.
- **No hay React Query / TanStack Query.** No hay caching de server state.
- **No hay hooks personalizados** más allá del re-export de `useColorScheme`.
- **Los stores son la única capa de estado.** Contienen: datos mock, filtros, loading/error states, y operaciones CRUD simuladas.

### Flujo de datos

```
Usuario interactúa → Screen llama función del store → Store modifica estado → 
Componente se re-renderiza con nuevos datos → UI se actualiza
```

No hay ciclo de persistencia (localStorage, AsyncStorage, etc.). Al recargar la app, todos los cambios se pierden.

---

## 4. Navigation

### Estructura de navegación

```
Root Stack (_layout.tsx)
├── (auth)/                          # Grupo de autenticación
│   └── login                        # Login screen
└── (app)/                           # Grupo autenticado
    ├── AppHeader (global)
    ├── settings/active-branch       # Modal fuera de tabs
    ├── customers/                   # Stack de clientes (fuera de tabs)
    │   ├── index                    # Lista
    │   ├── new                      # Crear
    │   ├── debtors                  # Deudores
    │   └── [id]/                    # Detalle, deudas, agregar dirección
    └── (tabs)/                      # Tab Navigator principal
        ├── Inicio (index)           # Dashboard
        ├── Productos (products/)    # Stack: lista, crear, detalle, editar
        ├── Pedidos (orders/)        # Stack: lista, crear, detalle, editar, +5 sub-pantallas
        └── Más (more)              # Perfil, navegación a clientes/settings
```

### Tabs

| Tab | Título | Icono | Ruta |
|-----|--------|-------|------|
| 0 | Inicio | house.fill | `/(app)/(tabs)/` |
| 1 | Productos | square.grid.2x2.fill | `/(app)/(tabs)/products/` |
| 2 | Pedidos | doc.text.fill | `/(app)/(tabs)/orders/` |
| 3 | Más | ellipsis.circle.fill | `/(app)/(tabs)/more` |

### Auth Guard

`src/app/(auth)/_layout.tsx` contiene un `useEffect` que monitorea `segments` y `user`:
- Si no hay usuario y NO está en `(auth)` → redirige a `/(auth)/login`
- Si hay usuario y SÍ está en `(auth)` → redirige a `/(app)/(tabs)`

`src/app/index.tsx` hace lo mismo como punto de entrada: redirect basado en presencia de `user`.

### Rutas protegidas

Todas las rutas bajo `(app)/` están protegidas implícitamente por el auth guard en `(auth)/_layout.tsx`. Si el usuario no está logueado, se redirige al login.

### Condiciones de navegación especiales

- El botón "Nuevo" en pedidos/productos solo se muestra si el usuario tiene permisos (`ADMINISTRATOR` o permisos específicos).
- Las secciones de "Administración" en `more.tsx` solo se muestran para `ADMINISTRATOR`.
- La pantalla de selección de dirección solo se muestra cuando `deliveryType === 'SHIPPING'`.

---

## 5. Screens

### 5.1 Login Screen
- **Archivo:** `src/app/(auth)/login.tsx`
- **Representa:** Pantalla de autenticación
- **Llega:** Al abrir la app sin sesión, o al hacer logout
- **Parámetros:** Ninguno
- **Estado interno:** `email`, `password`, `isLoading`, `errorMsg`
- **Lógica:**
  1. Valida que email y password no estén vacíos
  2. Simula delay de 1 segundo (`setTimeout`)
  3. Credenciales hardcodeadas:
     - `admin@elyuyei.com / admin` → usuario administrador con todos los permisos
     - `juan@elyuyei.com / employee` → empleado con permisos limitados
  4. Al autenticar: llama `login(mockUser)` y `setActiveBranch(mockUser.branches[0])`
  5. Navega a `/(app)/(tabs)`
- **Componentes:** `Screen`, `AppButton`, `AppInput`
- **Nota:** No hay backend real. Las credenciales son fijas.

### 5.2 Home Screen (Dashboard)
- **Archivo:** `src/app/(app)/(tabs)/index.tsx`
- **Representa:** Dashboard principal con stats y accesos rápidos
- **Llega:** Tab "Inicio"
- **Estado:** Usa `useAuthStore` y `useBranchStore`
- **Lógica:**
  - Muestra greeting personalizado con nombre del usuario y rol
  - Muestra 4 cards de estadísticas hardcodeadas de `mockDashboardStats`
  - Dos botones de acción rápida: "Nuevo Pedido" (navega a orders) e "Inventario" (navega a products)
- **Datos:** 100% mock (`mockDashboardStats`). Los valores son estáticos.

### 5.3 Orders List Screen
- **Archivo:** `src/app/(app)/(tabs)/orders/index.tsx`
- **Representa:** Lista de todos los pedidos
- **Estado:** Usa `useOrderStore` (orders, filtros, loading, error)
- **Lógica:**
  1. Lee pedidos del store
  2. Aplica filtros con `useMemo`: búsqueda por número/cliente, filtro por estado, filtro por tipo de entrega, filtrado por sucursal activa
  3. Muestra `FlatList` con `OrderCard` para cada pedido
  4. Pull-to-refresh con `RefreshControl`
  5. Empty states diferenciados: sin pedidos, sin resultados de filtros
  6. Botón "Nuevo" visible solo con permisos
- **Componentes:** `OrderCard`, `OrdersSearchBar`, `OrdersFilterList`, `OrdersErrorState`, `EmptyState`, `LoadingState`

### 5.4 New Order Screen
- **Archivo:** `src/app/(app)/(tabs)/orders/new.tsx`
- **Representa:** Flujo de creación de pedido
- **Estado:** `isSubmitting`, datos del draft desde `useOrderDraftStore`
- **Lógica:**
  1. Renderiza `OrderForm` con callbacks de submit/cancel
  2. `handleSubmitOrder`:
     - Valida: sucursal activa, al menos 1 producto, dirección si es envío
     - Calcula total, normaliza amountPaid (especial regla para cliente anónimo: si paga algo pero menos del total, se fuerza al total completo)
     - Llama `addOrder()` del store
     - Resetea draft y navega atrás
  3. `handleCancel`: Resetea draft y navega atrás
- **Componentes:** `OrderForm`

### 5.5 Edit Order Screen
- **Archivo:** `src/app/(app)/(tabs)/orders/[id]/edit.tsx`
- **Representa:** Edición de un pedido existente
- **Lógica:**
  1. Busca el pedido por ID en el store
  2. Renderiza `OrderForm` con `initialOrder` para pre-cargar datos
  3. Usa `updateOrder()` en vez de `addOrder()`
  4. Muestra `SuccessBanner` y navega atrás después de 600ms
- **Componentes:** `OrderForm`, `SuccessBanner`, `EmptyState`

### 5.6 Order Detail Screen
- **Archivo:** `src/app/(app)/(tabs)/orders/[id]/index.tsx`
- **Representa:** Vista detallada de un pedido
- **Lógica:**
  1. Busca pedido por ID
  2. Calcula si puede avanzar de estado (solo pedidos SHIPPING no draft/cancelled/entregados)
  3. Muestra: `OrderHeader`, `OrderInfoCard`, `OrderProducts`, `OrderTimeline`
  4. `OrderActions` visible solo para usuarios con permiso `ORDERS_UPDATE`
  5. Acciones disponibles: Editar, Confirmar (DRAFT→CONFIRMED), Avanzar estado, Cancelar
  6. Muestra `SuccessBanner` por 2 segundos tras cada acción exitosa
- **Componentes:** `OrderHeader`, `OrderInfoCard`, `OrderProducts`, `OrderTimeline`, `OrderActions`, `SuccessBanner`

### 5.7 Select Customer Screen
- **Archivo:** `src/app/(app)/(tabs)/orders/select-customer.tsx`
- **Representa:** Selección de cliente para un pedido
- **Lógica:**
  1. Muestra opción "Consumidor final" (anónimo) siempre disponible
  2. Lista de clientes registrados con búsqueda por nombre/email/teléfono
  3. Al seleccionar: setea `customer` en draft store, navega atrás
  4. Botón "Nuevo" para crear cliente desde el flujo de pedido
- **Estado:** `searchQuery` (del customer store), `currentCustomer` (del draft store)

### 5.8 Select Address Screen
- **Archivo:** `src/app/(app)/(tabs)/orders/select-address.tsx`
- **Representa:** Selección de dirección de envío
- **Lógica:**
  1. Muestra direcciones del cliente actual del draft
  2. Botón "Agregar nueva dirección" que navega a `add-address`
  3. Al seleccionar: setea `address` en draft store, navega atrás
- **Estado:** `customer` y `currentAddress` del draft store

### 5.9 Select Products Screen
- **Archivo:** `src/app/(app)/(tabs)/orders/select-products.tsx`
- **Representa:** Catálogo de productos para agregar al pedido
- **Lógica:**
  1. Filtra productos activos con stock > 0 en la sucursal activa
  2. Búsqueda por nombre o SKU
  3. Para productos con 1 variante: se agrega directamente
  4. Para productos con múltiples variantes: muestra selector de atributos (talle, color)
  5. Controles +/- por variante seleccionada, respetando stock máximo
  6. Barra flotante inferior muestra resumen del carrito (unidades + total)
  7. Botón "Ver resumen" navega atrás al formulario principal
- **Estado:** `selectedProductId`, `selectedAttributes` (local), items del draft store

### 5.10 Products List Screen
- **Archivo:** `src/app/(app)/(tabs)/products/index.tsx`
- **Representa:** Catálogo de productos
- **Lógica:**
  1. Filtra por búsqueda (nombre/SKU), categoría, estado (activo/inactivo), stock (con/sin stock)
  2. Stock calculado por sucursal activa
  3. Muestra count de resultados y botón "Limpiar filtros"
  4. `ProductCard` con toggle de activo/inactivo
  5. Pull-to-refresh
- **Componentes:** `ProductCard`, `ProductsSearchBar`, `ProductsFilterChips`, `CategoryPills`

### 5.11 Product Detail Screen
- **Archivo:** `src/app/(app)/(tabs)/products/[id]/index.tsx`
- **Representa:** Detalle de un producto con variantes
- **Lógica:**
  1. Muestra `ProductCard` como resumen
  2. Lista de variantes con atributos, SKU, precio, stock por sucursal
  3. Acciones: Editar, Activar/Desactivar
- **Componentes:** `ProductCard`, `NotFound`

### 5.12 New/Edit Product Screen
- **Archivos:** `src/app/(app)/(tabs)/products/new.tsx` y `[id]/edit.tsx`
- **Representa:** Formulario de creación/edición de productos
- **Lógica:**
  1. Usa `ProductForm` con `initialValues` (para edición) o vacío (para creación)
  2. Simula delay de 500ms antes de guardar
  3. Muestra `SuccessBanner` y navega atrás después de 600ms
- **Componentes:** `ProductForm`, `SuccessBanner`, `EmptyState`

### 5.13 Customers List Screen
- **Archivo:** `src/app/(app)/customers/index.tsx`
- **Representa:** Gestión de clientes
- **Lógica:**
  1. Lista con búsqueda por nombre/email/teléfono
  2. Pull-to-refresh
  3. Botón "Nuevo" para crear cliente
  4. Empty states diferenciados
- **Componentes:** `CustomerCard`, `AppInput`, `EmptyState`, `LoadingState`

### 5.14 Customer Detail Screen
- **Archivo:** `src/app/(app)/customers/[id]/index.tsx`
- **Representa:** Detalle de un cliente con sus direcciones
- **Lógica:**
  1. Muestra avatar con iniciales, nombre, email, teléfono
  2. Lista de direcciones con opción de agregar
  3. Empty state para clientes sin direcciones
- **Componentes:** `Avatar`, `NotFound`

### 5.15 Debtors Screen
- **Archivo:** `src/app/(app)/customers/debtors.tsx`
- **Representa:** Resumen de clientes con saldo pendiente
- **Lógica:**
  1. Agrega deuda por cliente usando `getBalanceDue()` sobre pedidos no cancelados/borrador
  2. Filtra por sucursal activa
  3. Ordena por deuda total descendente
  4. Al tocar un cliente, navega a `/customers/[id]/debts`

### 5.16 Customer Debts Screen
- **Archivo:** `src/app/(app)/customers/[id]/debts.tsx`
- **Representa:** Detalle de deudas de un cliente específico
- **Lógica:**
  1. Filtra pedidos del cliente con saldo pendiente (> 0)
  2. Muestra banner rojo con deuda total
  3. Lista de pedidos con items, total, pagado y saldo
  4. Botón "Registrar pago" **deshabilitado** (no implementado)

### 5.17 Active Branch Screen
- **Archivo:** `src/app/(app)/settings/active-branch.tsx`
- **Representa:** Selector de sucursal activa
- **Lógica:**
  1. Lista las sucursales del usuario logueado
  2. Muestra checkmark en la sucursal activa
  3. Al seleccionar: setea `activeBranch` y navega atrás

---

## 6. Components

### 6.1 UI Components (`src/components/ui/`)

#### Screen
- **Archivo:** `Screen.tsx`
- **Propósito:** Wrapper SafeAreaView con `edges=['left', 'right']` y background
- **Uso:** Envuelve todas las screens. El top safe area se maneja en `(app)/_layout.tsx`

#### AppButton
- **Archivo:** `AppButton.tsx`
- **Props:** `title: string`, `onPress: () => void`
- **Propósito:** Botón primario con estilo azul,;border-radius 10

#### AppInput
- **Archivo:** `AppInput.tsx`
- **Props:** Extiende `TextInputProps` de React Native
- **Propósito:** Input estilizado con border, height 48, border-radius 10

#### Avatar
- **Archivo:** `Avatar.tsx`
- **Props:** `name?`, `initials?`, `size?`, `backgroundColor?`, `textColor?`, `fontSize?`, `fontWeight?`, `children?`, `style?`
- **Propósito:** Círculo con iniciales o contenido custom. Calcula iniciales de `name` si no se proveen

#### EmptyState
- **Archivo:** `EmptyState.tsx`
- **Props:** `title`, `description?`, `iconName?`, `emoji?`, `actionLabel?`, `onAction?`
- **Propósito:** Estado vacío con icono, título, descripción y opcionalmente un botón de acción

#### ErrorState
- **Archivo:** `ErrorState.tsx`
- **Props:** `message?`, `onRetry: () => void`
- **Propósito:** Estado de error con icono de warning, título, mensaje y botón reintentar

#### LoadingState
- **Archivo:** `LoadingState.tsx`
- **Props:** `label?: string`
- **Propósito:** Centra un `ActivityIndicator` con texto de carga

#### FilterChip
- **Archivo:** `FilterChip.tsx`
- **Props:** `label: string`, `selected: boolean`, `onPress: () => void`
- **Propósito:** Chip toggle para filtros (estado, tipo de entrega, etc.)

#### SearchBar
- **Archivo:** `SearchBar.tsx`
- **Props:** `value: string`, `onChangeText: (text) => void`, más `TextInputProps`
- **Propósito:** Barra de búsqueda con icono de lupa y botón de limpiar

#### StatusBadge
- **Archivo:** `StatusBadge.tsx`
- **Props:** `status: OrderStatus`, `label?`, `showDot?: boolean`
- **Propósito:** Badge de color que muestra el estado de un pedido (Borrador, Confirmado, etc.)

#### SectionHeader
- **Archivo:** `SectionHeader.tsx`
- **Props:** `title: string`, `actionLabel?`, `onAction?`
- **Propósito:** Título de sección con opcional botón de acción a la derecha

#### MenuListItem
- **Archivo:** `MenuListItem.tsx`
- **Props:** `title`, `subtitle?`, `iconName?`, `onPress`, `showChevron?: boolean`, `textColor?`
- **Propósito:** Item de menú con icono, título, subtítulo y chevron

#### NotFound
- **Archivo:** `NotFound.tsx`
- **Props:** `headerTitle`, `title`, `description`, `iconName?`, `actionLabel?`, `onBack?`
- **Propósito:** Pantalla completa de "no encontrado" con header y EmptyState

#### Collapsible
- **Archivo:** `collapsible.tsx`
- **Props:** `title: string`, `children` (PropsWithChildren)
- **Propósito:** Sección colapsable con animación (usa react-native-reanimated). **No se usa actualmente en ninguna screen.**

### 6.2 App Components

#### AppHeader
- **Archivo:** `src/components/app/AppHeader.tsx`
- **Propósito:** Header global visible en todas las screens autenticadas. Muestra nombre de empresa y sucursal activa.
- **Estado:** Lee de `useAuthStore` y `useBranchStore`

### 6.3 Order Components (`src/components/orders/`)

#### OrderForm
- **Archivo:** `OrderForm.tsx`
- **Props:** `initialOrder?`, `onSubmitOrder`, `onCancel`, `isSubmitting?`, `submitLabel?`
- **Propósito:** Formulario completo de creación/edición de pedido. Es el componente más complejo.
- **Lógica:**
  1. `useEffect` inicializa el draft: `initNewOrder()` o `initEditOrder()` según haya `initialOrder`
  2. Compone: `OrderCustomerSection`, `OrderDeliverySection`, `OrderAddressSection`, `OrderCartSection`, `OrderSummarySection`
  3. `validate()` verifica: al menos 1 producto, dirección si es envío
  4. Navega a sub-pantallas para selección de cliente, dirección, productos
  5. `handleUpdateQuantity` busca el stock max de la variante y delega al store

#### OrderCustomerSection
- **Archivo:** `OrderCustomerSection.tsx`
- **Props:** `customer`, `onSelectCustomer`
- **Propósito:** Muestra el cliente seleccionado con avatar, nombre, email, teléfono y botón "Cambiar"

#### OrderDeliverySection
- **Archivo:** `OrderDeliverySection.tsx`
- **Props:** `deliveryType`, `onChangeDeliveryType`, `disabled?`
- **Propósito:** Toggle entre "Retiro en local" (LOCAL_PICKUP) y "Envío a domicilio" (SHIPPING)

#### OrderAddressSection
- **Archivo:** `OrderAddressSection.tsx`
- **Props:** `customer`, `selectedAddress`, `onSelectAddress`, `onAddCustomerAddress`
- **Propósito:** Sección de dirección de envío con 3 estados: sin direcciones, dirección seleccionada, direcciones disponibles sin seleccionar

#### OrderCartSection
- **Archivo:** `OrderCartSection.tsx`
- **Props:** `items`, `onAddProducts`, `onUpdateQuantity`, `onRemoveItem`
- **Propósito:** Carrito de productos con controles +/- por item y subtotal

#### OrderSummarySection
- **Archivo:** `OrderSummarySection.tsx`
- **Props:** `total`, `itemsCount`, `deliveryType`, `branchName`, `isSubmitting`, `submitLabel?`, `onSubmit`, `onCancel`, `disabled?`
- **Propósito:** Resumen del pedido con: sucursal, tipo entrega, estado inicial, total, opciones de pago (Total/Parcial), saldo pendiente, botones de envío
- **Estado interno:** `paymentMode` (TOTAL/PARTIAL), `inputValue` (monto parcial)
- **Lógica especial:** Cliente anónimo → modo parcial deshabilitado, se fuerza pago total

#### OrderHeader
- **Archivo:** `OrderHeader.tsx`
- **Props:** `order: Order`
- **Propósito:** Header con botón back, número de pedido y badge de estado

#### OrderInfoCard
- **Archivo:** `OrderInfoCard.tsx`
- **Props:** `order: Order`
- **Propósito:** Card con info del pedido: cliente, tipo entrega, dirección, sucursal, fecha, estado de pago, total, pagado, saldo

#### OrderProducts
- **Archivo:** `OrderProducts.tsx`
- **Props:** `order: Order`
- **Propósito:** Lista de productos del pedido con cantidad x precio unitario, subtotal y total

#### OrderTimeline
- **Archivo:** `OrderTimeline.tsx`
- **Props:** `order: Order`
- **Propósito:** Timeline vertical del flujo de estados. Para LOCAL_PICKUP: 2 pasos (Confirmado → Entregado). Para SHIPPING: 5 pasos. Muestra completados (checkmark verde), actual (dot azul), pendientes (gris). Estado cancelado → banner rojo.

#### OrderActions
- **Archivo:** `OrderActions.tsx`
- **Props:** `isDraft`, `canAdvance`, `onEdit`, `onConfirm`, `onAdvance`, `onCancel`
- **Propósito:** Barra de acciones del detalle de pedido. DRAFT: Editar + Confirmar. Avanzable: "Avanzar estado". Siempre: "Cancelar pedido"

#### OrderCard
- **Archivo:** `OrderCard.tsx`
- **Props:** `order: Order`, `onPress`
- **Propósito:** Card para la lista de pedidos. Muestra: número, badge estado, cliente, badge tipo entrega, cantidad items, total, fecha relativa (Hoy/Ayer/fecha)

#### OrdersSearchBar / OrdersFilterList / OrdersErrorState / SuccessBanner
- Componentes auxiliares: barra de búsqueda de pedidos, filtros horizontales, estado de error y banner de éxito temporal.

### 6.4 Product Components (`src/components/products/`)

#### ProductForm
- **Archivo:** `ProductForm.tsx` (301 líneas)
- **Props:** `initialValues?`, `categories`, `attributes`, `attributeValues`, `branches`, `existingProducts`, `currentProductId?`, `onSubmit`, `onCancel`, `isSubmitting`, `submitLabel`
- **Propósito:** Formulario completo de producto con:
  - Nombre (requerido)
  - Selector de categoría (modal bottom sheet)
  - Modo de variante: simple (sin atributos) o con atributos
  - Generación de variantes por combinaciones de atributos
  - Auto-generación de SKU (formato: `XXX-NNN`)
  - Precio por variante
  - Stock por sucursal
  - Descripción
  - Toggle activo/inactivo
  - Validación: nombre requerido, categoría requerida, SKUs únicos, precios válidos, stock válido

#### ProductCard
- **Archivo:** `ProductCard.tsx` (290 líneas)
- **Props:** `product`, `stock`, `canEdit?`, `onPress?`, `onToggleActive?`
- **Propósito:** Card de lista con: SKU o count de variantes, badge categoría, badge activo/inactivo, nombre, descripción, precio (o "Desde $X"), badge de stock (verde/naranja/rojo según cantidad)

#### ProductsSearchBar / ProductsFilterChips / CategoryPills / CategoryModal
- Componentes de filtrado: barra de búsqueda, chips de filtro (stock: con/sin stock, estado: activo/inactivo), pills de categoría scrollables, modal bottom-sheet para selección de categoría.

### 6.5 Customer Components (`src/components/customers/`)

#### CustomerForm
- **Archivo:** `CustomerForm.tsx` (675 líneas)
- **Props:** `onCustomerCreated?: (customer) => void`
- **Propósito:** Formulario completo de creación de cliente con:
  - Nombre (requerido), email, teléfono
  - Sección de direcciones: lista existente, sub-formulario inline para nueva dirección
  - Validación de campos requeridos
  - Usa `useCustomerStore.addCustomer()`
  - Si se provee `onCustomerCreated`, lo llama después de crear (para flujo de pedido)

#### CustomerCard
- **Archivo:** `CustomerCard.tsx`
- **Props:** `customer`, `onPress`
- **Propósito:** Card de lista con avatar, nombre, email, teléfono, badge de direcciones

#### AddCustomerAddressForm
- **Archivo:** `AddCustomerAddressForm.tsx` (359 líneas)
- **Props:** `customerId`, `onAddressCreated?: () => void`
- **Propósito:** Formulario para agregar dirección a un cliente existente
- **Lógica:** Valida label, street, number, city, province. Usa `useCustomerStore.addCustomerAddress()`

### 6.6 Components sin uso activo

#### BranchCard
- **Archivo:** `BranchCard.tsx`
- **Estado:** No se importa en ninguna screen. Parece un componente abandonado/desarrollo temprano.

#### BranchSelector
- **Archivo:** `BranchSelector.tsx`
- **Estado:** No se importa en ninguna screen. El selector de sucursal se implementa directamente en `active-branch.tsx`.

#### QuantitySelector
- **Archivo:** `QuantitySelector.tsx`
- **Estado:** No se importa en ninguna screen. La funcionalidad de cantidad está integrada directamente en `OrderCartSection` y `select-products.tsx`.

---

## 7. Custom Hooks

### Hooks existentes

| Hook | Archivo | Propósito |
|------|---------|-----------|
| `useColorScheme` | `src/hooks/use-color-scheme.ts` | Re-export de React Native's `useColorScheme`. No se usa activamente. |

**No hay hooks personalizados propios.** Toda la lógica reutilizable está encapsulada en los stores de Zustand o inline en los componentes.

### Oportunidad de extracción

Hay lógica repetida que podría convertirse en hooks:
- Cálculo de `canCreate` / `canEdit` (se repite en orders, products)
- Cálculo de `filteredOrders` / `filteredProducts` (lógica de filtrado similar)
- Formateo de fechas relativas (Hoy/Ayer) en `OrderCard`

---

## 8. Services & API

### No existen servicios ni comunicación con APIs reales.

Todo el data layer está compuesto por:

1. **Mock Data** (`src/data/`): Datos hardcodeados para usuarios, clientes, pedidos, productos, dashboard
2. **Zustand Stores** (`src/stores/`): Contienen los datos mock como estado inicial y operaciones CRUD que modifican el estado en memoria
3. **Simulación de延迟**: `setTimeout` de 500-1000ms en login, reload, y operaciones de guardado

### Flujo actual (sin backend)

```
Screen → Store (Zustand) → Mock Data (in-memory) → UI
```

### Flujo futuro esperado

```
Screen → Store (Zustand) → Service (fetch/axios) → Backend API → Store → UI
```

Actualmente no hay ni la estructura de servicios ni ninguna llamada HTTP en el proyecto.

---

## 9. State Management

### Zustand Stores (6 stores)

#### useAuthStore
- **Archivo:** `src/stores/auth-store.ts`
- **Estado:** `user: User | null`
- **Acciones:** `login(user)`, `logout()`
- **Persistencia:** Ninguna. Se pierde al recargar.

#### useBranchStore
- **Archivo:** `src/stores/branch-store.ts`
- **Estado:** `activeBranch: Branch | null`
- **Acciones:** `setActiveBranch(branch)`, `clearActiveBranch()`
- **Consumido por:** HomeScreen, OrdersScreen, ProductsScreen, AppHeader, select-products, debtors, customer debts, edit order, new order

#### useCustomerStore
- **Archivo:** `src/stores/customer-store.ts`
- **Estado:** `customers[]`, `searchQuery`, `isLoading`, `isError`, `errorMessage`
- **Acciones:** CRUD de clientes y direcciones, filtros, reload simulado
- **Nota:** `reloadCustomers` solo simula delay de 600ms sin cambiar datos

#### useOrderStore
- **Archivo:** `src/stores/order-store.ts`
- **Estado:** `orders[]`, filtros (searchQuery, statusFilter, deliveryTypeFilter), loading/error states
- **Acciones:** CRUD de pedidos, confirm/cancel/advance status, filtros, reload simulado
- **Lógica de negocio:**
  - `addOrder`: Genera ID, número secuencial (PED-001, PED-002...), estado inicial según tipo (LOCAL_PICKUP→CONFIRMED, SHIPPING→DRAFT)
  - `confirmOrder`: Solo de DRAFT → CONFIRMED
  - `cancelOrder`: De cualquier estado excepto CANCELLED y DELIVERED
  - `advanceOrderStatus`: Solo para SHIPPING, avanza en el flujo CONFIRMED→IN_PREPARATION→READY_TO_SHIP→SHIPPED→DELIVERED
  - `normalizeAmountPaid`: Para cliente anónimo, si paga algo pero no todo, se fuerza al total

#### useOrderDraftStore
- **Archivo:** `src/stores/order-draft-store.ts`
- **Estado:** `orderId`, `customer`, `deliveryType`, `address`, `items[]`, `amountPaid`
- **Propósito:** Estado temporal del formulario de pedido (nuevo o edición). Se resetea después de cada operación.
- **Acciones:** `initNewOrder`, `initEditOrder`, setters, `addItem`, `updateItemQuantity`, `removeItem`, `clearCart`, `reset`
- **Lógica de `addItem`**: Valida stock, incrementa cantidad si ya existe, crea nuevo item si no

#### useProductStore
- **Archivo:** `src/stores/product-store.ts`
- **Estado:** `products[]`, `categories[]`, `attributes[]`, `attributeValues[]`, filtros, loading/error states
- **Acciones:** CRUD de productos, filtros, toggle activo/inactivo, reload simulado

### Patrón de Zustand utilizado

Todos los stores usan `create<StateType>()` con tipo explícito. Acceden al estado con `(state) => state.field` para optimizar re-renders (selectores granulares).

### Datos que NO se persisten

- Sesión de usuario (se pierde al recargar)
- Sucursal activa
- Draft del pedido en progreso
- Todos los cambios CRUD (clientes, productos, pedidos)

---

## 10. Types & Interfaces

### src/types/auth.ts
- `Company`: `{ id, name }`
- `Role`: `'ADMINISTRATOR' | 'EMPLOYEE'`
- `Permission`: 17 permisos posibles (PRODUCTS_*, CATEGORIES_*, CUSTOMERS_*, ORDERS_*, INVENTORY_*, TRANSFERS_*, USERS_MANAGE, BRANCHES_MANAGE, REPORTS_READ, SHIPPING_READ)
- `User`: `{ id, name, email, role, company, branches, permissions }`

### src/types/branch.ts
- `Branch`: `{ id, name }`

### src/types/customer.ts
- `CustomerAddress`: `{ id, label, street, number, city, province, zipCode }`
- `Customer`: `{ id, name, email?, phone?, addresses[] }`
- `CUSTOMER_ANONYMOUS`: Constante para "Consumidor final" (id: 'customer-anonymous')

### src/types/order.ts
- `OrderStatus`: DRAFT | CONFIRMED | IN_PREPARATION | READY_TO_SHIP | SHIPPED | DELIVERED | CANCELLED
- `PaymentStatus`: PENDING | PARTIAL | PAID
- `DeliveryType`: LOCAL_PICKUP | SHIPPING
- `OrderItem`: `{ id, productId, variantId, productName, productSku, quantity, unitPrice, subtotal }`
- `Order`: `{ id, orderNumber, customerId, customerName, deliveryType, address?, branchId, branchName, items[], total, amountPaid, status, createdAt, updatedAt }`
- Helper functions: `getPaymentStatus()`, `getBalanceDue()`
- Constants: `ORDER_STATUS_LABELS`, `PAYMENT_STATUS_LABELS`, `DELIVERY_TYPE_LABELS`, `SHIPPING_STATUS_FLOW`

### src/types/product.ts
- `Category`: `{ id, name, description?, active }`
- `ProductAttribute`: `{ id, name, active }`
- `ProductAttributeValue`: `{ id, attributeId, name, active }`
- `ProductVariantAttribute`: `{ attributeId, attributeValueId }`
- `ProductVariant`: `{ id, sku, price, attributes[], stockByBranch: Record<string, number> }`
- `Product`: `{ id, name, categoryId, categoryName?, description?, active, variants[] }`
- `ProductFormData`: Tipo para el formulario (price como string)
- `StockFilter`, `StatusFilter`: Tipos para filtros

---

## 11. Utils & Helpers

### src/utils/format.ts
- `getInitials(name)`: Extrae las 2 primeras letras de las palabras del nombre
- `formatDateTime(iso)`: "1 de septiembre de 2026 · 10:30" (locale es-AR)
- `formatCurrency(amount)`: "$45.200"
- `formatDate(iso)`: "1 de septiembre de 2026"

### src/utils/status.ts
- `getStatusBadgeColor(status)`: Devuelve `{ bg, text, dot }` para cada OrderStatus. Usado por `StatusBadge`.

### src/constants/
- `Colors`: Paleta completa (primary azul, backgrounds, borders, success/warning/error)
- `Spacing`: xs(4), sm(8), md(12), lg(16), xl(24), xxl(32)
- `Typography`: Tamaños de fuente (caption 12 hasta title 28)

### src/styles/shared.ts
- `SharedStyles`: Estilos compartidos reutilizados en múltiples screens: header, back button, pressed state, success banner, card, search, filter chips, error container, loading, buttons (primary, secondary, danger)

---

## 12. Main User Flows

### Flow 1: Login

```
App starts → index.tsx checks user → No user → Redirect to login
   ↓
LoginScreen renders
   ↓
User enters email + password
   ↓
handleLogin() validates (non-empty)
   ↓
setTimeout(1000ms) simulates server
   ↓
Matches hardcoded credentials
   ↓
login(mockUser) → useAuthStore sets user
setActiveBranch(firstBranch) → useBranchStore sets branch
   ↓
router.replace('/(app)/(tabs)')
   ↓
Auth guard detects user in auth group → redirects to tabs
   ↓
HomeScreen renders with user data
```

### Flow 2: Create Order

```
Orders Screen → tap "Nuevo" button
   ↓
router.push('/orders/new')
   ↓
NewOrderScreen renders
   ↓
OrderForm useEffect: initNewOrder() → resets draft store
   ↓
OrderForm renders sections:
   1. OrderCustomerSection (default: Consumidor final)
   2. OrderDeliverySection (default: LOCAL_PICKUP)
   3. OrderCartSection (empty)
   4. OrderSummarySection
   ↓
User taps "Cambiar" → navigates to select-customer
   ↓
SelectCustomerScreen → user picks a customer → setDraftCustomer() → router.back()
   ↓
User selects "Envío a domicilio" → setDeliveryType('SHIPPING')
   ↓
OrderAddressSection appears → navigates to select-address
   ↓
SelectAddressScreen → user picks address → setAddress() → router.back()
   ↓
User taps "Agregar productos" → navigates to select-products
   ↓
SelectProductsScreen → user browses catalog, selects variants, adds to cart
   ↓
addItem() in order-draft-store → items[] updated
   ↓
Sticky cart bar shows total → user taps "Ver resumen" → router.back()
   ↓
Back in OrderForm → cart section shows items, summary shows total
   ↓
User taps "Crear Pedido" → validate() runs
   ↓
handleSubmitOrder() in NewOrderScreen:
   - Calculates total, normalizes amountPaid
   - addOrder() in order-store → creates order with ID, number, status
   - resetDraft() → clears draft store
   - router.back() → returns to orders list
   ↓
Orders list re-renders with new order (via Zustand subscription)
```

### Flow 3: Edit Product

```
Products Screen → tap product card → navigates to /products/[id]
   ↓
ProductDetailScreen → tap "Editar" → navigates to /products/[id]/edit
   ↓
EditProductScreen → finds product by ID
   ↓
ProductForm receives initialValues (product data transformed to form format)
   ↓
User modifies fields → local state in ProductForm
   ↓
User taps "Guardar Cambios" → validate() runs
   ↓
handleSubmit():
   - setIsSubmitting(true)
   - setTimeout(500ms) simulates save
   - updateProduct(id, updates) in product-store
   - setSuccessMessage
   - setTimeout(600ms) → router.back()
```

### Flow 4: View Customer Debts

```
More Screen → tap "Clientes que deben"
   ↓
DebtorsScreen → useMemo aggregates debt per customer from orders
   ↓
FlatList shows customer cards with total debt
   ↓
User taps a customer → navigates to /customers/[id]/debts
   ↓
CustomerDebtsScreen → filters orders for that customer with balance > 0
   ↓
Shows total debt banner + list of pending orders
   ↓
Each order shows items, total, paid, balance
   ↓
"Registrar pago" button exists but is DISABLED (not implemented)
```

---

## 13. Component Relationships

```
src/app/_layout.tsx (Root Stack)
├── (auth)/_layout.tsx (Auth Guard)
│   └── login.tsx
│       ├── Screen
│       ├── AppButton
│       └── AppInput
└── (app)/_layout.tsx (SafeAreaView + AppHeader)
    ├── AppHeader
    │   ├── Avatar
    │   └── useAuthStore, useBranchStore
    ├── (tabs)/_layout.tsx (Tab Navigator)
    │   ├── index.tsx (Home)
    │   │   ├── Screen, SectionHeader
    │   │   └── useAuthStore, useBranchStore, mockDashboardStats
    │   ├── more.tsx
    │   │   ├── Screen, Avatar, MenuListItem
    │   │   └── useAuthStore, useBranchStore
    │   ├── orders/
    │   │   ├── index.tsx (Orders List)
    │   │   │   ├── OrderCard, OrdersSearchBar, OrdersFilterList
    │   │   │   ├── OrdersErrorState, EmptyState, LoadingState
    │   │   │   └── useAuthStore, useBranchStore, useOrderStore
    │   │   ├── new.tsx (New Order)
    │   │   │   └── OrderForm
    │   │   │       ├── OrderCustomerSection
    │   │   │       ├── OrderDeliverySection
    │   │   │       ├── OrderAddressSection
    │   │   │       ├── OrderCartSection
    │   │   │       └── OrderSummarySection
    │   │   ├── select-customer.tsx
    │   │   │   └── useCustomerStore, useOrderDraftStore
    │   │   ├── select-address.tsx
    │   │   │   └── useOrderDraftStore
    │   │   ├── select-products.tsx
    │   │   │   └── useProductStore, useOrderDraftStore, useBranchStore
    │   │   ├── new-customer.tsx → CustomerForm
    │   │   ├── add-address.tsx → AddCustomerAddressForm
    │   │   └── [id]/
    │   │       ├── index.tsx (Order Detail)
    │   │       │   ├── OrderHeader, OrderInfoCard, OrderProducts
    │   │       │   ├── OrderTimeline, OrderActions, SuccessBanner
    │   │       │   └── useAuthStore, useOrderStore
    │   │       └── edit.tsx (Edit Order)
    │   │           ├── OrderForm, SuccessBanner, EmptyState
    │   │           └── useOrderStore, useCustomerStore, useOrderDraftStore
    │   └── products/
    │       ├── index.tsx (Products List)
    │       │   ├── ProductCard, ProductsSearchBar, ProductsFilterChips
    │       │   ├── CategoryPills, EmptyState, ErrorState, LoadingState
    │       │   └── useAuthStore, useBranchStore, useProductStore
    │       ├── new.tsx → ProductForm
    │       └── [id]/
    │           ├── index.tsx → ProductCard, NotFound
    │           └── edit.tsx → ProductForm, EmptyState
    ├── customers/
    │   ├── index.tsx → CustomerCard, AppInput, EmptyState, LoadingState
    │   ├── new.tsx → CustomerForm
    │   ├── debtors.tsx → EmptyState, getBalanceDue
    │   └── [id]/
    │       ├── index.tsx → Avatar, NotFound
    │       ├── debts.tsx → DebtOrderCard (inline), EmptyState
    │       └── add-address.tsx → AddCustomerAddressForm
    └── settings/
        └── active-branch.tsx → useAuthStore, useBranchStore
```

---

## 14. Current Frontend Status

### Lo que está implementado

- **Login:** Funcional con credenciales hardcodeadas (2 usuarios)
- **Navegación completa:** Auth guard, tabs, stacks, parámetros dinámicos
- **Gestión de productos:** Lista con filtros, creación con variantes/atributos/stock por sucursal, edición, detalle, activar/desactivar
- **Gestión de pedidos:** Lista con filtros, creación multi-paso (seleccionar cliente → tipo entrega → dirección → productos → resumen), edición, detalle con timeline de estados, confirmar/cancelar/avanzar
- **Gestión de clientes:** Lista con búsqueda, creación con direcciones, detalle, deudas
- **Selector de sucursal:** Cambio de sucursal activa con filtrado en pedidos y productos
- **Sistema de permisos:** Visual (botones y secciones se muestran/ocultan según rol y permisos)
- **Estados de UI:** Loading, empty states, error states, success banners, pull-to-refresh

### Lo que está incompleto o no funciona

- **No hay backend real:** Todo usa mocks y `setTimeout`
- **"Registrar pago"** en debts.tsx está deshabilitado (`disabled` attribute)
- **"Mi Perfil"** en more.tsx tiene `onPress={() => { }}` (noop)
- **"Usuarios"** en more.tsx tiene `onPress={() => { }}` (noop)
- **"Sucursales"** en more.tsx tiene `onPress={() => { }}` (noop)
- **Dashboard** usa stats hardcodeados (`mockDashboardStats`), no refleja datos reales
- **La sucursal activa** se setea solo en el login con la primera branch del usuario; no hay persistencia
- **No hay logout con limpieza de stores** además de auth-store (branch-store, order-draft-store, etc. quedan con datos)

### Componentes terminados

- Todos los componentes UI genéricos (`src/components/ui/`)
- `AppHeader`
- `OrderCard`, `OrderHeader`, `OrderInfoCard`, `OrderProducts`, `OrderTimeline`, `OrderActions`
- `OrderCustomerSection`, `OrderDeliverySection`, `OrderAddressSection`, `OrderCartSection`, `OrderSummarySection`
- `ProductCard`, `CategoryPills`, `ProductsSearchBar`, `ProductsFilterChips`, `CategoryModal`
- `CustomerCard`
- `SuccessBanner`

### Componentes con lógica compleja

- `OrderForm` (223 líneas): Orquestación del flujo de pedido
- `OrderSummarySection` (492 líneas): Lógica de pago parcial/total
- `ProductForm` (301 líneas): Generación de variantes y validaciones
- `CustomerForm` (675 líneas): Formulario con sub-formulario de direcciones inline
- `AddCustomerAddressForm` (359 líneas): Formulario con validaciones
- `select-products.tsx` (424 líneas): Selección de variantes con atributos

### Funcionalidades conectadas a APIs reales

**Ninguna.** No hay ninguna llamada HTTP, fetch, axios, o similar en todo el proyecto.

### Funcionalidades con mocks/datos hardcodeados

- **Usuarios:** `mock-user.ts` (2 usuarios: admin y empleado)
- **Clientes:** `mock-customers.ts` (5 clientes con direcciones)
- **Pedidos:** `mock-orders.ts` (9 pedidos en diferentes estados)
- **Productos:** `mock-products.ts` (12 productos con variantes, 6 categorías, 2 atributos, 18 valores de atributo)
- **Dashboard:** `mock-dashboard.ts` (4 stats, 3 pedidos recientes)

---

## 15. TODOs / Missing Functionality

1. **Backend integration:** No hay servicio API. Todo el data layer necesita ser conectado a un backend real.
2. **Persistencia de sesión:** El login se pierde al recargar la app. Necesita AsyncStorage o similar.
3. **Persistencia de sucursal activa:** Se pierde al cerrar sesión.
4. **Pago de deudas:** El botón "Registrar pago" está deshabilitado.
5. **Perfil de usuario:** "Mi Perfil" en el menú Más no tiene implementación.
6. **Gestión de usuarios:** La sección de "Usuarios" en el menú de admin está vacía.
7. **Gestión de sucursales:** La sección de "Sucursales" en el menú de admin está vacía.
8. **Dashboard dinámico:** Las stats del home son hardcodeadas.
9. **Persistencia de datos CRUD:** Los cambios a clientes, productos y pedidos se pierden al recargar.
10. **Paginación:** No hay paginación en ninguna lista (FlatList con todos los datos).
11. **Búsqueda server-side:** La búsqueda es client-side sobre datos en memoria.
12. **Manejo de errores de red:** No hay manejo de errores de red (no hay red).
13. **Optimistic updates:** No hay actualizaciones optimistas.
14. **Logout completo:** Solo limpia auth-store, no los demás stores.

---

## 16. Technical Debt / Potential Improvements

### Deuda técnica detectada

1. **No hay separación de capa de servicios.** Los stores de Zustand mezclan estado, lógica de negocio y "persistencia" (mock data). Al integrar un backend, será necesario extraer una capa de servicios.

2. **Duplicación de lógica de filtrado.** La lógica de `useMemo` para filtrar pedidos/productos se repite en cada screen. Podría extraerse a custom hooks o funciones compartidas.

3. **Duplicación de verificación de permisos.** `canCreate` / `canEdit` se calculan de la misma forma en orders y products.

4. **Componentes sin uso.** `BranchCard`, `BranchSelector`, `QuantitySelector` y `collapsible.tsx` no se utilizan. Deberían eliminarse o documentarse como componentes预留.

5. **Estilos duplicados.** Muchos componentes y screens redefinen estilos similares (headers, botones de back, cards). `SharedStyles` ayuda pero no cubre todos los casos.

6. **Hardcoded values.** Colores específicos como `#F0F9FF`, `#EDE9FE`, `#F0FDFA` aparecen inline en lugar de usar la paleta de `Colors`.

7. **`as any` en rutas.** En `products/index.tsx` y `customers/index.tsx` se usan casts `as any` para rutas de navegación, lo que sugiere un problema de tipado con Expo Router.

8. **Normalización inconsistente de IDs.** Los IDs se generan con `Date.now()` (productos: `prod-${Date.now()}`, clientes: `cust-${Date.now()}`), lo que puede causar colisiones en operaciones rápidas.

9. **useEffect dependencies.** En `OrderForm.tsx`, el `useEffect` tiene dependencias que podrían causar re-renders innecesarios (`getCustomerById`, `initEditOrder`, `initNewOrder`).

10. **Sin tests.** No hay ningún archivo de test en el proyecto.

11. **Sin manejo de errores a nivel global.** Los errores se manejan con `console.error` inline.

12. **OrderSummarySection es muy grande** (492 líneas) y maneja demasiada responsabilidad. Debería dividirse en componentes más pequeños.

13. **CustomerForm es el componente más grande** (675 líneas) con sub-formulario inline. Debería refactorizarse en componentes separados.

14. **select-products.tsx tiene JSX indentado inconsistentemente** y lógica de renderizado muy densa. Debería limpiarse.

15. **No hay invalidación de cache.** Cuando se crea/edita un producto, el store se actualiza pero no hay mecanismo para sincronizar con otros stores que puedan tener referencias stale.
