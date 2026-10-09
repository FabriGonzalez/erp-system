# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# AGENTS.md — Contexto del frontend del ERP

## 1. Objetivo del proyecto

Este repositorio contiene el frontend de un ERP desarrollado con **Expo / React Native**, conectado a un backend REST en **Java Spring Boot**. La aplicación administra empresas, sucursales, usuarios, categorías, productos, variantes, atributos, inventario y, próximamente, ventas/pedidos y transferencias.

La prioridad es mantener un frontend consistente con los contratos reales del backend, estados predecibles y flujos seguros para operaciones de negocio. Antes de cambiar código, inspeccioná la implementación existente y seguí el flujo completo de datos.

## 2. Estructura y tecnologías

Estructura aproximada:

```text
erp-system/
├── backend/
├── frontend/
│   └── erp-system/
│       └── src/
│           ├── app/          # Expo Router: layouts y pantallas
│           ├── components/   # Componentes reutilizables
│           ├── services/     # Comunicación HTTP con el backend
│           ├── stores/       # Estado global con Zustand
│           └── types/        # Tipos TypeScript y contratos
├── docker-compose.yml
└── .git/
```

Stack del frontend:
- Expo / React Native.
- Expo Router para navegación y layouts.
- TypeScript.
- Zustand para estado global.
- AsyncStorage para persistencia local.
- Servicios REST bajo `src/services/`.

La estructura exacta puede evolucionar. Verificá los archivos existentes antes de asumir rutas o nombres.

## 3. Reglas generales de trabajo

1. **Inspeccioná antes de editar.** Buscá la pantalla, componente, store, servicio y tipo que participan en el flujo completo.
2. **No inventes contratos del backend.** Confirmá métodos HTTP, rutas, cuerpos, respuestas y códigos de estado en el código existente/backend. No asumas que toda respuesta exitosa contiene JSON.
3. **Buscá la causa raíz.** No agregues `setTimeout`, renders forzados ni parches visuales para esconder problemas de sincronización.
4. **Cambios acotados.** No refactorices módulos ajenos al problema ni alteres funcionalidades que no fueron solicitadas.
5. **Respetá la arquitectura existente.** Reutilizá servicios, stores, componentes y patrones actuales cuando corresponda.
6. **Mantené TypeScript estricto y tipos coherentes** entre request, response, dominio y estado de UI.
7. **No elimines `.git`.** No sobrescribas cambios locales que no estén relacionados con la tarea.
8. Al finalizar, resumí qué archivos cambiaste, cuál era la causa raíz y qué validaciones ejecutaste. Diferenciá claramente pruebas realizadas de pruebas que solo recomendás realizar.

## 4. Arquitectura de datos

Flujo habitual:

```text
Pantalla / componente
        ↓
Store de Zustand (cuando corresponda)
        ↓
Servicio de dominio en src/services
        ↓
Cliente API compartido
        ↓
Backend REST
```

Evitá colocar llamadas HTTP directamente en componentes si el módulo ya utiliza un servicio/store para ese propósito. No agregues estado global para datos que claramente pertenecen solo a un componente.

Los stores deben mantener sincronizadas todas las representaciones de una entidad que efectivamente se usen en la UI. Si una operación modifica una entidad, revisá las listas, selecciones y detalles que puedan contener copias de esa entidad.

## 5. Cliente API y manejo de errores

Existe un cliente compartido en `src/services/api-client.ts`, con la función `apiFetch`. Los servicios de dominio deben usarlo en lugar de llamar directamente a `fetch`, salvo excepciones intencionales y documentadas.

### Sesión expirada

- `apiFetch` detecta respuestas HTTP `401` y activa `expireSession()` en `auth-store`.
- La detección debe permanecer centralizada; no distribuyas comprobaciones por mensaje de error en cada store o pantalla.
- Un `401` durante el login significa credenciales inválidas y **no** debe activar el flujo de sesión expirada. Usá la opción de exclusión que ya exista en el cliente API si corresponde.
- La expiración se muestra mediante un overlay/modal global montado desde `src/app/_layout.tsx`, sin crear una ruta nueva.
- El overlay bloquea la interacción, informa que la sesión expiró, muestra una cuenta regresiva de 5 segundos y permite cerrar sesión inmediatamente.
- La expiración limpia la sesión y el contexto/sucursal activa.
- El logout voluntario debe continuar llevando directamente al login sin mostrar el overlay de expiración.
- Evitá múltiples ejecuciones ante varios `401` simultáneos y limpiá los timers al desmontar el componente.
- Un login exitoso debe restablecer el estado de sesión expirada.

No cambies este flujo sin necesidad explícita y verificá que siga funcionando después de modificar autenticación, navegación o servicios.

## 6. Autenticación y sucursales

Archivos de referencia:
- `src/stores/auth-store.ts`
- `src/stores/branch-store.ts`
- `src/services/branch-service.ts`
- `src/app/_layout.tsx`
- `src/app/(app)/_layout.tsx`
- `src/app/(app)/settings/active-branch.tsx`
- `src/components/branches/BranchUsersAssignmentModal.tsx`

El contexto de sucursal está asociado al usuario y a la empresa. La persistencia de la sucursal activa usa AsyncStorage y debe validarse contra el contexto de sesión actual. Nunca se debe restaurar una sucursal del usuario/empresa anterior después de cerrar sesión o iniciar otra sesión.

### Reglas para el estado de sucursales

- `activeBranch`, `availableBranches` y `allBranches` pueden contener representaciones de la misma sucursal; al cambiar la sucursal activa, mantenelas coherentes.
- La selección manual de una sucursal debe prevalecer sobre hidrataciones/cargas anteriores que terminen tarde.
- `hydrateActiveBranch()` y `fetchUserBranches()` deben respetar el contexto `userId` / `companyId`.
- `clearActiveBranch()` y el cambio de contexto de sesión deben invalidar operaciones antiguas que podrían escribir estado o persistencia después.
- No permitas que una respuesta asíncrona vieja sobrescriba una acción más reciente del usuario.

### Usuarios asignados a sucursales

El modal `BranchUsersAssignmentModal.tsx` permite asignar o quitar usuarios de una sucursal. Las asignaciones se envían a endpoints del estilo:
- `POST /api/v1/users/{userId}/branches/{branchId}`
- `DELETE /api/v1/users/{userId}/branches/{branchId}`

**Importante:** el backend puede responder `201` o `204` sin body. No ejecutes `response.json()` indiscriminadamente sobre respuestas vacías. Un `2xx` válido sin contenido no debe convertirse en un error que dispare un rollback optimista.

Al trabajar con toggles:
- Actualizá el estado local de forma coherente.
- Hacé rollback solo si la operación realmente falla.
- Protegé el estado frente a respuestas de carga antiguas.
- No uses delays ni re-renders forzados para resolver carreras.

## 7. Productos, variantes e inventario

El frontend gestiona productos con variantes, atributos y stock por sucursal.

### Tipos de producto

El dominio de producto incluye:
- Producto: `id`, `name`, `categoryId`, `active`, `variants`, y metadatos opcionales.
- Variante: `id`, `sku`, `price`, `attributes`, `stockByBranch`, y metadatos opcionales.

Los IDs de API pueden llegar como números; el dominio del frontend puede normalizarlos a strings según los helpers ya existentes. Conservá esa convención dentro de cada capa y evitá comparaciones inconsistentes entre `number` y `string`.

### Stock

- El stock se consulta mediante los endpoints de inventario y se asocia a las variantes por `productVariantId`.
- El frontend ha utilizado una carga de productos y stocks en paralelo para evitar una request de stock por variante. Antes de cambiar esta estrategia, comprobá el comportamiento actual para no introducir un problema N+1.
- La estructura de dominio para stock por variante es `stockByBranch: Record<string, number>`.
- `PATCH /api/v1/inventory/stocks/adjust` recibe `productVariantId`, `branchId`, `newQuantity` y `reason`. `newQuantity` representa la **cantidad final**, no el delta.
- Para la creación de productos, el request de variante usa `initialStock`.
- Para la edición de productos, el contrato implementado utiliza un request específico de actualización con `stock` por sucursal. No reutilices `initialStock` en una actualización.
- La edición de producto busca actualizar producto, variantes, atributos y cantidades de stock en una única operación transaccional del backend. No vuelvas a coordinar múltiples PATCH de stock desde la pantalla de edición sin una decisión explícita de arquitectura.
- Las cantidades pueden ser cero; las cantidades negativas no son válidas.

Al modificar productos o stock, probá tanto el caso normal como la combinación de precio/atributos/stock y verificá que los datos persistan al volver a cargar.

## 8. Prevención de condiciones de carrera

Este ERP tiene operaciones asíncronas en las que el usuario puede seguir interactuando mientras se ejecutan requests. Para evitar regresiones:

- Identificá qué request puede finalizar después de otra operación más reciente.
- Usá cancelación, identificadores/versiones de request o validaciones de contexto cuando corresponda.
- Antes de aplicar una respuesta, verificá que siga siendo válida para la pantalla, entidad y sesión actuales.
- No permitas que una carga inicial pendiente sobrescriba un toggle, selección o edición reciente.
- No persistás en AsyncStorage datos derivados de una respuesta obsoleta.
- No confundas un error de parseo de una respuesta vacía con un error real del servidor.

## 9. Validación y pruebas

Desde el directorio del frontend (`frontend/erp-system`), ejecutar cuando corresponda:

```bash
npx tsc --noEmit
```

Para ESLint, usar el script del proyecto o ejecutarlo sobre los archivos modificados, por ejemplo:

```bash
npx eslint src/services/branch-service.ts src/stores/branch-store.ts src/components/branches/BranchUsersAssignmentModal.tsx
```

También revisar:

```bash
git diff --check
```

No afirmes que un comando pasó si no se ejecutó o si devolvió errores. Si el lint global tiene warnings/errores preexistentes, distinguí los resultados de los archivos modificados de los problemas no relacionados.

### Casos de regresión útiles

**Sesión**
- `401` en un endpoint autenticado activa una sola vez el overlay.
- `401` del login no activa el overlay.
- El logout voluntario va directamente al login.
- El overlay bloquea la app y el contador/ botón cierran la sesión correctamente.
- Volver a iniciar sesión no conserva el estado de expiración ni una sucursal de otro contexto.

**Sucursales**
- Asignar/desasignar usuario deja el toggle en el estado correcto.
- Respuestas `201`/`204` sin body no provocan rollback.
- Seleccionar una sucursal activa actualiza la UI y persiste después de recargar.
- Cambiar de sucursal activa no permite que una hidratación antigua restaure la anterior.
- Cambiar de usuario/empresa no reutiliza la selección anterior.

**Productos e inventario**
- Crear producto con stock inicial.
- Editar precio y stock conjuntamente.
- Llevar stock a cero.
- Editar stock en varias sucursales.
- Reabrir el producto y verificar persistencia.
- Confirmar que la carga de productos no introduzca requests de stock por cada variante.

## 10. Estado funcional conocido

Implementado en el frontend:
- Gestión de sucursales.
- Categorías.
- Productos y variantes.
- Atributos y valores de atributos.
- Inventario/stock.
- Autenticación y selección/persistencia de sucursal.
- Flujo global de sesión expirada.

Próximas áreas del roadmap:
- Ventas / pedidos.
- Transferencias entre sucursales.

Confirmá siempre el estado real del código antes de asumir que un módulo está completo.

## 11. Cómo reportar el resultado de una tarea

Al finalizar, respondé en español y de forma concreta:
1. Qué cambió y en qué archivos.
2. La causa raíz del problema, si se corrigió un bug.
3. Qué validaciones realmente se ejecutaron y sus resultados.
4. Qué pruebas manuales siguen pendientes, si las hay.

No hagas cambios no solicitados ni presentes hipótesis como causas confirmadas.
