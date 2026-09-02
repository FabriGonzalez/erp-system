# ERP System — UI Agent Context

## 1. Propósito del agente

Este proyecto es una aplicación móvil ERP multi-tenant desarrollada con React Native + Expo.

El objetivo de este agente es **implementar y perfeccionar exclusivamente la interfaz de usuario (UI), navegación y experiencia visual de la aplicación**, utilizando únicamente las tecnologías, dependencias, componentes y arquitectura que ya existen en el proyecto.

El agente **NO es responsable de implementar backend, API, autenticación real, persistencia, lógica de negocio compleja ni nuevas dependencias**.

Los datos utilizados durante esta etapa serán mocks.

La implementación debe quedar preparada para que posteriormente otro agente/desarrollador pueda reemplazar los mocks por llamadas reales al backend sin tener que rehacer las pantallas.

---

# 2. Regla principal

> **DO NOT EXPAND THE TECH STACK.**

El agente debe trabajar exclusivamente con las dependencias existentes en `package.json`.

### Prohibido

No instalar ni agregar nuevas dependencias.

No modificar `package.json`.

No modificar versiones de dependencias.

No agregar librerías de UI.

No agregar librerías de iconos.

No agregar librerías de formularios.

No agregar librerías de navegación.

No agregar librerías de manejo de estado.

No agregar librerías de networking.

No agregar librerías de almacenamiento.

No agregar librerías de animaciones.

No agregar librerías de testing.

Si una funcionalidad visual puede implementarse utilizando React Native, Expo Router, Zustand y los componentes existentes, debe hacerse de esa manera.

Si una funcionalidad requiere una dependencia nueva, **NO implementarla agregando la dependencia**. Dejar preparada la estructura o informar que requiere una decisión posterior.

---

# 3. Stack actual

## Frontend

* React Native
* Expo
* TypeScript
* Expo Router
* Zustand
* React Native Reanimated
* React Native Gesture Handler
* React Native Safe Area Context
* Expo Symbols
* Expo Image
* Expo UI
* Expo Linking
* Expo Web Browser

El proyecto utiliza actualmente Expo SDK 57.

React Native:

```text
0.86.x
```

React:

```text
19.x
```

---

# 4. Plataforma

La aplicación es principalmente una:

> **Mobile App**

No diseñar como una aplicación web responsive.

Las pantallas deben pensarse primero para teléfonos.

El proyecto puede ejecutarse también en web durante desarrollo, pero la prioridad visual y de interacción es:

```text
iOS
Android
```

No crear layouts pensando principalmente en desktop.

---

# 5. Tema visual

La aplicación utilizará inicialmente:

```text
LIGHT MODE
```

No es necesario desarrollar dark mode en esta etapa.

El diseño debe ser:

* limpio
* profesional
* moderno
* sobrio
* orientado a una aplicación empresarial
* fácil de leer
* buena jerarquía visual
* espaciado consistente
* componentes reutilizables

Evitar diseños excesivamente llamativos, infantiles o similares a aplicaciones de redes sociales.

El producto es un ERP profesional.

---

# 6. Arquitectura de navegación

El proyecto utiliza Expo Router.

La estructura conceptual es:

```text
src/
└── app/
    ├── _layout.tsx
    │
    ├── (auth)/
    │   └── login.tsx
    │
    └── (app)/
        ├── _layout.tsx
        │
        └── (tabs)/
            ├── _layout.tsx
            └── index.tsx
```

---

# 7. Root Layout

Actualmente:

```text
src/app/_layout.tsx
```

es responsable de controlar si el usuario está autenticado.

Su responsabilidad principal es:

```text
Authentication / Route Protection
```

No modificar esta lógica salvo que sea estrictamente necesario para resolver un problema visual de navegación.

Actualmente utiliza:

```tsx
useAuthStore
useRouter
useSegments
Slot
```

No reemplazar este sistema por otro.

---

# 8. App Layout

La aplicación autenticada utiliza:

```text
src/app/(app)/_layout.tsx
```

Este layout será responsable de la estructura visual global de la aplicación.

La intención es:

```text
AppLayout
│
├── AppHeader
│
└── Slot
```

El `AppHeader` debe aparecer en las pantallas de la aplicación autenticada.

No duplicar manualmente el header dentro de cada pantalla.

---

# 9. Bottom Navigation

La aplicación utilizará navegación inferior.

La navegación principal debe priorizar las áreas que se utilizan frecuentemente.

La navegación puede evolucionar durante la implementación, pero debe mantenerse consistente con Expo Router.

No crear un sistema de navegación personalizado.

Utilizar Expo Router.

---

# 10. Multi-tenancy

El sistema es:

> **MULTI-TENANT**

No existe una empresa global única.

La empresa utilizada actualmente para mocks puede llamarse:

```text
ElYuyei
```

pero esto es solamente una empresa de ejemplo.

No asumir que ElYuyei es la empresa principal del sistema.

Conceptualmente:

```text
Tenant / Company
        │
        └── Users
        └── Branches
        └── Products
        └── Customers
        └── Orders
        └── Inventory
```

La UI debe evitar hardcodear la empresa como una constante global.

Debe consumirla desde el usuario/mock correspondiente.

---

# 11. Usuario

Un usuario pertenece a una empresa.

Además, un usuario puede estar asociado a múltiples sucursales.

Conceptualmente:

```text
Company
   │
   └── User
        │
        ├── Branch A
        ├── Branch B
        └── Branch C
```

El usuario NO pertenece necesariamente a una sola sucursal.

---

# 12. Sucursal activa

La aplicación trabaja siempre con una:

```text
activeBranch
```

La sucursal activa debe manejarse mediante el estado global existente con Zustand.

La UI debe mostrar permanentemente la sucursal activa en el header.

Ejemplo:

```text
ElYuyei

📍 Sucursal Centro
```

El usuario podrá cambiar la sucursal desde:

```text
Más
→
Configuración
→
Sucursal activa
```

El selector no debe estar permanentemente abierto en el header.

El header solamente muestra cuál es la sucursal actual.

---

# 13. Estado global

El proyecto utiliza Zustand.

Actualmente existen stores relacionados con:

```text
auth
branch
```

Utilizar los stores existentes.

No reemplazar Zustand.

No crear otro sistema global de estado.

No introducir Redux, Context global adicional, MobX, Jotai, Recoil, etc.

---

# 14. Auth Store

El Auth Store representa la sesión del usuario.

Conceptualmente contiene:

```text
user
```

El usuario puede contener información como:

```text
id
name
email
company
branches
permissions
role
```

La estructura exacta debe respetar el código existente.

No inventar una segunda estructura incompatible.

---

# 15. Branch Store

El Branch Store representa:

```text
activeBranch
```

Debe utilizarse para saber en qué sucursal está trabajando actualmente el usuario.

Cuando la UI cambie la sucursal:

```text
setActiveBranch(...)
```

debe actualizarse el store.

No mantener una copia paralela de la sucursal activa dentro de cada pantalla.

---

# 16. App Header

El header es un componente global.

Debe mostrar como mínimo:

```text
Company name
Active branch
User/profile affordance
```

Ejemplo:

```text
┌──────────────────────────────┐
│ ElYuyei                  A   │
│ 📍 Sucursal Centro           │
└──────────────────────────────┘
```

El header debe ser reutilizable.

No copiar y pegar el código del header en cada pantalla.

---

# 17. Responsabilidad del UI Agent

El agente puede trabajar en:

* pantallas
* navegación visual
* layouts
* componentes UI
* estados visuales
* formularios visuales
* validaciones visuales simples
* listas
* cards
* filtros
* búsqueda
* tabs
* modales
* bottom sheets si pueden hacerse con herramientas existentes
* loaders
* skeletons si pueden implementarse sin dependencias
* empty states
* error states
* success states
* toasts si existe una implementación ya disponible
* animaciones usando herramientas existentes
* iconografía disponible en el proyecto
* mock data
* estados de mock
* permisos visuales
* ocultar/mostrar acciones según permisos mockeados
* navegación entre pantallas
* diseño mobile
* safe areas
* accesibilidad básica
* feedback visual

---

# 18. Lo que el UI Agent NO debe hacer

El agente no debe:

* crear endpoints
* consumir APIs reales
* implementar Axios
* implementar fetch contra backend
* implementar JWT real
* implementar refresh tokens
* implementar interceptors
* implementar almacenamiento seguro
* implementar persistencia real
* modificar Spring Boot
* modificar PostgreSQL
* crear migraciones
* crear DTOs backend
* crear entidades backend
* implementar reglas de negocio complejas
* implementar transacciones
* implementar lógica de inventario real
* implementar integración con Zipnova
* implementar webhooks
* implementar analytics reales
* implementar reportes reales
* implementar exportación
* instalar paquetes
* modificar package.json
* cambiar el sistema de navegación
* reemplazar Zustand
* reemplazar Expo Router

---

# 19. Mock Data

Durante esta etapa se utilizarán mocks.

Los mocks deben estar separados de los componentes visuales siempre que sea razonable.

Preferir:

```text
mock data
    ↓
screen
    ↓
components
```

sobre:

```text
component
    ↓
hardcoded data
```

Evitar:

```tsx
<Text>Producto 1</Text>
<Text>Producto 2</Text>
<Text>Producto 3</Text>
```

Preferir:

```ts
mockProducts.map(...)
```

Esto permitirá reemplazar posteriormente los mocks por datos reales.

---

# 20. Los mocks deben representar casos reales

No utilizar únicamente datos ideales.

Las pantallas deben poder representar:

### Listas

* varios elementos
* un solo elemento
* lista vacía

### Productos

* producto activo
* producto inactivo
* producto con stock
* producto sin stock
* diferentes precios

### Clientes

* cliente completo
* cliente con múltiples direcciones
* cliente sin direcciones

### Pedidos

Utilizar todos los estados:

```text
DRAFT
CONFIRMED
IN_PREPARATION
READY_TO_SHIP
SHIPPED
DELIVERED
CANCELLED
```

### Envíos

Representar estados normales y error.

### Inventario

Representar:

* stock positivo
* stock cero
* diferentes sucursales

---

# 21. Roles y permisos

Actualmente existen dos roles conceptuales:

```text
ADMINISTRATOR
EMPLOYEE
```

El administrador puede realizar todas las operaciones principales.

El empleado tiene permisos operativos limitados.

Ejemplo:

```text
ADMIN
├── create orders
├── manage customers
├── manage products
├── manage categories
├── manage prices
├── adjust stock
├── transfer stock
├── manage users
├── manage branches
├── reports
└── shipping
```

Empleado:

```text
EMPLOYEE
├── view orders
├── prepare orders
├── view inventory
└── view shipments
```

El empleado:

```text
NO puede crear pedidos
NO puede modificar información crítica
```

La UI debe respetar los permisos mockeados.

Por ejemplo:

```text
ADMIN
→ mostrar botón "Crear pedido"

EMPLOYEE
→ ocultar botón "Crear pedido"
```

No mostrar una acción prohibida y simplemente esperar que el backend la rechace.

La UI debe reflejar los permisos.

---

# 22. Importante: permisos no son seguridad

El ocultamiento de botones en frontend es solamente UX.

La seguridad real será implementada posteriormente en backend.

Nunca asumir que:

```text
button hidden
```

significa:

```text
permission secured
```

El backend será la autoridad final.

---

# 23. Módulos de la aplicación

La aplicación tendrá conceptualmente estos módulos:

```text
Auth
Users
Roles / Permissions
Branches
Categories
Products
Inventory
Customers
Orders
Shipping
Sales / Reports
Settings
```

Analytics avanzado queda fuera de esta etapa.

---

# 24. Auth Screen

Debe existir una pantalla de login.

El sistema es multi-tenant.

El login actualmente puede utilizar:

```text
email / username
temporary password
```

La contraseña temporal será creada por el administrador/sistema.

No implementar autenticación real.

Usar mocks.

El login debe simular:

```text
login
→ loading
→ success
→ authenticated app
```

y también:

```text
login
→ error
```

---

# 25. Home

Home será el punto de entrada de la aplicación.

Debe mostrar información útil y no solamente un placeholder.

Puede incluir:

```text
Welcome / context
Active branch
Quick actions
Order summary
Operational information
```

No implementar analytics avanzado.

---

# 26. Products

La pantalla de productos debe permitir visualizar:

```text
Products
```

Debe incluir:

* búsqueda
* filtros
* estado activo/inactivo
* stock visible
* precio
* cantidad disponible
* categoría cuando corresponda

Los productos sin stock:

```text
NO desaparecen
```

Deben poder filtrarse.

Ejemplo:

```text
Todos
Con stock
Sin stock
```

No utilizar imágenes de producto por ahora.

La lista puede mostrar:

```text
Nombre
Precio
Cantidad
```

---

# 27. Product Create / Edit

El administrador puede:

```text
crear producto
editar producto
activar producto
desactivar producto
```

Un producto:

```text
pertenece a una categoría
```

No existe un producto sin categoría.

El SKU debe mostrarse como campo relevante.

No implementar eliminación física.

La acción visual debe ser:

```text
Deactivate
```

en lugar de borrar definitivamente.

---

# 28. Categories

Debe existir CRUD visual para categorías:

```text
List
Create
Edit
Activate
Deactivate
```

Las categorías pueden tener:

```text
active / inactive
```

---

# 29. Customers

La pantalla de clientes debe incluir:

* listado
* búsqueda
* filtros
* estado
* crear cliente
* editar cliente
* activar/desactivar
* acceso a direcciones

Debe existir una pantalla para las direcciones de un cliente.

Un cliente puede tener múltiples direcciones.

---

# 30. Addresses

Las direcciones deben poder:

```text
List
Create
Edit
Activate
Deactivate
```

La estructura puede ser flexible porque posteriormente los campos reales serán definidos por backend.

En general se espera información como:

```text
name
street
number
city
postal code
notes
```

pero el UI Agent debe evitar asumir campos innecesarios.

---

# 31. Orders

Orders es uno de los módulos más importantes.

El pedido es el aggregate principal.

La pantalla de listado debe mostrar:

```text
Order number
Customer
Branch
Status
Total
Date
```

Debe permitir filtros por estado.

Estados:

```text
DRAFT
CONFIRMED
IN_PREPARATION
READY_TO_SHIP
SHIPPED
DELIVERED
CANCELLED
```

---

# 32. Create Order Flow

El flujo de creación de pedido debe ser visualmente claro y dividido en pasos.

Conceptualmente:

```text
Create Order
     ↓
Customer
     ↓
Address
     ↓
Products
     ↓
Cart
     ↓
Summary
     ↓
Draft
```

El pedido comienza como:

```text
DRAFT
```

Mientras está en DRAFT:

```text
NO descuenta stock
NO genera movimientos
NO crea envío
```

Estas reglas deben reflejarse visualmente.

---

# 33. Product Selection for Orders

La idea principal para crear un pedido es:

```text
Create Order
     ↓
Navigate to Products
     ↓
Search products
     ↓
Add products
     ↓
Return to cart/order
```

La pantalla de selección de productos debe permitir:

* búsqueda
* filtros
* visualizar stock
* agregar producto
* aumentar cantidad
* disminuir cantidad

La cantidad máxima visualmente permitida debe corresponder al stock mockeado.

Ejemplo:

```text
Stock = 5

1  2  3  4  5
```

No permitir seleccionar 6 desde la UI mock.

---

# 34. Cart

El carrito debe mostrar:

```text
Product
Quantity
Unit price
Subtotal
```

El precio unitario debe conservarse como snapshot del pedido.

El subtotal debe visualizarse.

El total debe visualizarse.

---

# 35. Delivery Type

Cada pedido tiene un tipo de entrega:

```text
LOCAL_PICKUP
SHIPPING
```

Para retiro local:

```text
LOCAL_PICKUP
```

El flujo termina con la entrega.

Para envío:

```text
SHIPPING
```

se deberá representar visualmente la existencia de un shipment.

No implementar integración real con Zipnova.

---

# 36. Order Detail

Debe existir una pantalla de detalle del pedido.

Debe mostrar:

```text
Order information
Customer
Address
Items
Totals
Delivery type
Shipment information
Status
Timeline
```

Debe existir un timeline visual del pedido.

El timeline debe representar los cambios de estado.

---

# 37. Order Actions

Las acciones deben depender del estado del pedido.

Por ejemplo:

```text
DRAFT
→ Confirm
→ Cancel

CONFIRMED
→ Prepare

IN_PREPARATION
→ Ready to ship

READY_TO_SHIP
→ Ship

SHIPPED
→ Deliver
```

Estas acciones son principalmente visuales/mock en esta etapa.

No implementar las reglas de negocio reales.

---

# 38. Inventory

El inventario se maneja por sucursal.

No existe stock global.

Conceptualmente:

```text
Product + Branch
        ↓
      Stock
```

La pantalla debe respetar siempre el contexto de:

```text
activeBranch
```

---

# 39. Inventory List

Mostrar:

```text
Product
Stock quantity
```

No es necesario crear una pantalla de detalle de stock en esta etapa.

Debe existir visualmente:

```text
Stock adjustment
```

para administrador.

---

# 40. Stock Movements

Debe existir una pantalla/listado para movimientos.

Tipos:

```text
SALE
ADJUSTMENT
TRANSFER_IN
TRANSFER_OUT
```

Los movimientos son históricos.

No permitir modificar movimientos históricos desde la UI.

---

# 41. Transfers

La transferencia de stock ocurre entre sucursales.

Flujo:

```text
Create Transfer
      ↓
Origin branch
      ↓
Destination branch
      ↓
Products
      ↓
Quantity
      ↓
Summary
      ↓
Confirm
```

Estados:

```text
DRAFT
CONFIRMED
CANCELLED
```

Solo administrador puede realizar transferencias.

No implementar aprobación.

---

# 42. Transfer Detail

Debe mostrar:

```text
Origin
Destination
Products
Quantities
Status
Date
Timeline / information
```

No implementar lógica real de modificación de stock.

---

# 43. Shipping

Shipping queda parcialmente preparado.

No implementar integración real con Zipnova.

Debe ser posible visualizar:

```text
Shipment
Tracking
Status
Label
```

Estados visuales pueden incluir:

```text
PENDING
CREATED
IN_TRANSIT
DELIVERED
ERROR
```

Si Zipnova falla:

```text
Shipment = ERROR
```

El pedido no se cancela.

La UI debe poder representar:

```text
Shipment error
Retry
```

pero el retry será solamente mock.

---

# 44. Sales

Debe existir una sección de ventas simple.

Objetivo:

> Poder visualizar qué se vendió por día y por sucursal.

Debe permitir filtros.

Por ejemplo:

```text
Date
Branch
```

La pantalla debe mostrar información operacional de ventas.

No implementar analytics avanzado.

No implementar exportación.

---

# 45. Settings

Debe existir una sección de configuración.

La sucursal activa se cambia desde:

```text
Settings
→
Active Branch
```

La configuración puede contener:

```text
Company
Active Branch
Users
Roles & Permissions
Branches
Profile
Logout
```

Las funcionalidades pueden ser progresivamente implementadas.

---

# 46. Active Branch Screen

Debe mostrar las sucursales disponibles para el usuario.

Ejemplo:

```text
Select active branch

✓ Sucursal Centro

  Sucursal Norte

  Sucursal Sur
```

Al seleccionar una:

```text
setActiveBranch(branch)
```

Debe actualizarse el Branch Store.

El AppHeader debe reflejar inmediatamente el cambio.

---

# 47. Loading States

Todas las pantallas que simulen operaciones deben contemplar loading.

Ejemplo:

```text
Loading products...
```

Preferir una solución visual liviana.

Usar skeleton cuando sea sencillo y mejore la experiencia.

Usar spinner cuando un skeleton sea innecesario.

No instalar librerías nuevas para esto.

---

# 48. Empty States

Las listas deben tener estados vacíos.

Ejemplo:

```text
No customers found

Try changing your search or filters.
```

No mostrar una pantalla rota o simplemente una lista vacía.

---

# 49. Error States

Las pantallas deben poder representar errores.

Ejemplo:

```text
Something went wrong

Try again
```

Los errores serán simulados con mocks.

No implementar manejo de errores de API real.

---

# 50. Toasts / Feedback

Para acciones como:

```text
Product created
Customer updated
Branch changed
Order created
```

se debe mostrar feedback visual.

Utilizar solamente mecanismos existentes.

No instalar una librería de toast.

---

# 51. Search

Las listas que tengan búsqueda deben incluir un campo de búsqueda.

La implementación visual debe contemplar:

```text
typing
loading/debounce visual
results
empty results
clear search
```

El debounce real puede implementarse posteriormente.

En esta etapa puede utilizarse una simulación sencilla si es necesario.

---

# 52. Componentización

Evitar pantallas monolíticas.

Preferir:

```text
Screen
 ├── Header
 ├── Filters
 ├── List
 │    └── Card
 └── Actions
```

Crear componentes reutilizables cuando exista una necesidad real.

No crear componentes innecesarios por cada pequeño `<View>`.

---

# 53. Naming

Seguir convenciones de TypeScript/React.

Componentes:

```text
PascalCase
```

Ejemplos:

```text
AppHeader.tsx
ProductCard.tsx
CustomerCard.tsx
OrderCard.tsx
```

Funciones/variables:

```text
camelCase
```

Ejemplos:

```text
activeBranch
handleSubmit
products
```

Archivos de componentes:

```text
PascalCase.tsx
```

Archivos de hooks/utilidades:

```text
camelCase.ts
```

---

# 54. Existing Components

Antes de crear un componente nuevo, revisar si ya existe uno reutilizable.

Actualmente existen componentes como:

```text
components/
├── animated-icon
├── app-tabs
├── external-link
├── hint-row
├── themed-text
├── themed-view
├── web-badge
└── ui/
    └── collapsible
```

No reemplazarlos arbitrariamente.

Si un componente ya existente sirve, reutilizarlo.

Si el componente es claramente parte del template inicial de Expo y ya no es necesario, no eliminarlo sin razón.

---

# 55. Styling

Utilizar React Native styles existentes.

Preferir:

```tsx
StyleSheet.create(...)
```

sobre estilos inline repetidos.

Mantener consistencia de:

* spacing
* typography
* border radius
* shadows
* colors
* buttons
* inputs
* cards

No introducir una nueva design system library.

---

# 56. Design System

Si durante la implementación se detecta que varios componentes necesitan exactamente el mismo estilo, crear componentes UI reutilizables.

Ejemplos:

```text
Button
Input
Card
Badge
EmptyState
ScreenHeader
SectionHeader
```

Pero no crear un design system gigantesco de antemano.

Primero detectar patrones reales.

---

# 57. Accessibility

Cuando sea razonable:

* utilizar labels claros
* botones suficientemente grandes
* buen contraste
* textos legibles
* no depender únicamente del color
* utilizar `accessibilityLabel` cuando sea necesario

---

# 58. Navigation Rules

Utilizar exclusivamente Expo Router.

Ejemplos:

```text
router.push(...)
router.replace(...)
router.back()
```

No crear:

```text
NavigationService
CustomRouter
NavigationManager
```

salvo que ya exista una necesidad arquitectónica clara.

---

# 59. Back Navigation

Las pantallas secundarias deben utilizar la navegación estándar de Expo Router.

No crear manualmente un sistema global de back navigation.

Cuando sea apropiado:

```text
router.back()
```

El header de navegación puede mostrar la flecha estándar proporcionada por Expo Router cuando corresponda.

---

# 60. Data Flow

La arquitectura visual esperada es:

```text
Screen
   ↓
Store / Mock
   ↓
Components
```

No mezclar:

```text
API
Database
Business logic
UI
```

en un mismo componente.

---

# 61. Mock Actions

Las acciones pueden simular cambios.

Por ejemplo:

```text
Create Product
```

puede:

```text
show loading
→ add mock item
→ show success
→ return to list
```

No necesita realizar una llamada HTTP.

---

# 62. No fake backend

No crear endpoints locales.

No crear:

```text
/api
/server
express
json-server
mock server
```

No es necesario.

Los mocks pueden ser archivos TypeScript.

---

# 63. No implementar API Client

No crear:

```text
axios
fetch
apiClient
interceptors
repositories
```

para esta fase.

Eso será realizado posteriormente.

---

# 64. Future Backend Compatibility

Aunque no se implementará backend ahora, las pantallas deben diseñarse pensando en que posteriormente recibirán datos desde:

```text
Spring Boot REST API
```

Por eso:

* evitar hardcodear valores
* evitar mezclar datos con UI
* evitar asumir IDs
* evitar lógica de negocio compleja
* mantener estructuras de datos razonables
* mantener componentes reutilizables

---

# 65. Screens First

El agente debe trabajar por funcionalidades completas.

No crear primero 40 modelos sin pantallas.

El objetivo de esta fase es obtener un frontend navegable.

Prioridad:

```text
Screen
→ Navigation
→ Mock Data
→ UI States
→ Polish
```

---

# 66. Suggested implementation order

Implementar en este orden:

```text
1. App Shell
2. Header
3. Bottom Tabs
4. Auth / Login
5. Home
6. Settings
7. Active Branch
8. Products
9. Categories
10. Customers
11. Addresses
12. Orders
13. Order creation flow
14. Cart
15. Order detail
16. Inventory
17. Stock movements
18. Transfers
19. Sales
20. Shipping
21. Users
22. Roles / Permissions
```

No es necesario implementar backend para ninguna de estas fases.

---

# 67. Agent Workflow

Antes de modificar código:

1. Leer `AGENT_CONTEXT.md`.
2. Inspeccionar la estructura actual del proyecto.
3. Inspeccionar `package.json`.
4. Inspeccionar los stores existentes.
5. Inspeccionar los layouts existentes.
6. Inspeccionar los componentes existentes.
7. Identificar qué ya está implementado.
8. No duplicar funcionalidades existentes.

Después:

1. Implementar una funcionalidad.
2. Revisar navegación.
3. Revisar estados.
4. Revisar permisos.
5. Revisar consistencia visual.
6. Revisar TypeScript.
7. Revisar que no se hayan agregado dependencias.
8. Revisar que no se haya modificado arquitectura existente innecesariamente.

---

# 68. Self-review obligatorio

Después de implementar cada módulo, revisar:

### UI

* ¿Se ve como una aplicación mobile profesional?
* ¿La jerarquía visual es clara?
* ¿Los botones son fáciles de utilizar?
* ¿Hay suficiente espacio?
* ¿Los textos no se cortan?

### Estados

* ¿Existe loading?
* ¿Existe empty state?
* ¿Existe error state?
* ¿Existe success feedback cuando corresponde?

### Navigation

* ¿La navegación funciona?
* ¿El back funciona?
* ¿Las rutas siguen Expo Router?

### Permissions

* ¿Las acciones están ocultas para usuarios sin permiso?

### Data

* ¿Los datos vienen de mocks?
* ¿Se evitó hardcodear listas directamente dentro del JSX?

### Architecture

* ¿Se respetaron los stores existentes?
* ¿Se respetó Expo Router?
* ¿Se evitaron dependencias nuevas?

---

# 69. Definition of Done

Una pantalla se considera terminada cuando:

```text
✓ Navega correctamente
✓ Tiene UI completa
✓ Tiene datos mock
✓ Tiene loading
✓ Tiene empty state cuando corresponde
✓ Tiene error state cuando corresponde
✓ Tiene feedback visual
✓ Respeta permisos
✓ Respeta activeBranch
✓ No requiere backend
✓ No agregó dependencias
✓ No rompió navegación existente
✓ TypeScript compila
✓ No contiene código innecesariamente duplicado
```

---

# 70. Código existente es autoridad

Si este documento contradice accidentalmente el código existente respecto a detalles técnicos menores, primero inspeccionar el código.

No asumir.

No reescribir arquitectura existente solamente para ajustarla a este documento.

Si existe una contradicción importante, detenerse y reportarla.

---

# 71. Cambios prohibidos sin aprobación

El agente no debe modificar sin aprobación explícita:

```text
package.json
tsconfig.json
babel.config.*
metro.config.*
app.json
app.config.*
Expo Router architecture
Zustand architecture
authentication flow
existing stores
global navigation
```

Puede modificar pantallas y componentes necesarios para la UI.

---

# 72. Regla contra sobreingeniería

No crear abstracciones solamente porque "podrían ser útiles en el futuro".

Preferir:

```text
simple
clear
reusable when justified
```

sobre:

```text
over-engineered
generic
abstract
```

---

# 73. Regla contra código innecesario

Si una funcionalidad visual puede resolverse con React Native estándar:

```text
View
Text
Pressable
ScrollView
FlatList
TextInput
Modal
ActivityIndicator
StyleSheet
```

utilizar eso.

No buscar una librería externa.

---

# 74. Objetivo final de esta fase

El resultado esperado es:

```text
ERP Mobile App
│
├── Login
│
├── Home
│
├── Products
│
├── Categories
│
├── Customers
│
├── Orders
│
├── Inventory
│
├── Transfers
│
├── Sales
│
├── Shipping
│
├── Users
│
├── Roles
│
└── Settings
```

Todo debe ser:

```text
Navegable
Visualmente consistente
Mockeado
Mobile-first
Permission-aware
Branch-aware
Multi-tenant-aware
Backend-ready
```

pero **sin implementar todavía el backend ni las integraciones reales**.

---

# 75. Regla final

> **Your job is to make the ERP look and feel complete.**
>
> **Your job is NOT to make the ERP technically complete.**

La implementación real de:

```text
API
JWT
Database
Business rules
Persistence
Security
Zipnova
Stock transactions
Order transactions
Backend validation
```

será realizada posteriormente.

Durante esta fase, priorizar:

```text
UX
UI
Navigation
Mock states
Consistency
Polish
```

y mantener intacta la arquitectura técnica existente.
