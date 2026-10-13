import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

/**
 * Caché de datos del servidor (TanStack Query). Regla del proyecto: lo que viene del
 * backend va acá; el estado propio del cliente (sesión, sucursal activa, borrador de
 * orden) sigue en Zustand.
 */

function statusOf(error: unknown): number | null {
    if (typeof error === 'object' && error !== null && 'status' in error) {
        const status = (error as { status: unknown }).status;
        return typeof status === 'number' ? status : null;
    }
    return null;
}

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Datos de un ERP compartido: se consideran frescos poco tiempo.
            staleTime: 30_000,
            // Un 4xx (404, 403, validación) no se arregla reintentando; solo red o 5xx.
            retry: (failureCount, error) => {
                const status = statusOf(error);
                if (status !== null && status >= 400 && status < 500) {
                    return false;
                }
                return failureCount < 2;
            },
        },
        mutations: {
            retry: false,
        },
    },
});

// En web TanStack usa el foco de la ventana; en el celular, volver la app al frente.
if (Platform.OS !== 'web') {
    focusManager.setEventListener((handleFocus) => {
        const subscription = AppState.addEventListener('change', (state) => {
            handleFocus(state === 'active');
        });
        return () => subscription.remove();
    });
}

/**
 * Descarta todo lo cacheado. Se llama al iniciar o terminar una sesión: los datos
 * son de una empresa y no pueden quedar visibles para otro usuario o empresa.
 */
export function clearServerCache() {
    void queryClient.cancelQueries();
    queryClient.clear();
}
