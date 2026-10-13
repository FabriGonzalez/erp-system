# Panel de plataforma

Panel web mínimo para el usuario `PLATFORM_ADMIN`: listar empresas, darlas de alta y suspenderlas, reactivarlas o cancelarlas. No lo usan las empresas.

## Uso

```bash
cd frontend/admin-panel
npm install
npm run dev
```

Abre en <http://localhost:5173>. Necesita el backend levantado; por defecto apunta a `http://localhost:8080`. Para otro backend, creá `.env.local` con:

```
VITE_API_URL=https://api.ejemplo.com
```

## Endpoints que consume

| Acción | Endpoint |
|---|---|
| Login | `POST /api/v1/auth/login` (rechaza cuentas sin `platformAdmin`) |
| Listar empresas | `GET /api/v1/provisioning/companies` |
| Alta de empresa + admin | `POST /api/v1/provisioning/companies` |
| Suspender / reactivar / cancelar | `PATCH /api/v1/provisioning/companies/{id}/status` |

Al dar de alta una empresa, la contraseña temporal del administrador se muestra **una sola vez**. Cancelar una empresa es definitivo.

La sesión se guarda en `sessionStorage`: sobrevive a recargar la pestaña y se borra al cerrarla.
