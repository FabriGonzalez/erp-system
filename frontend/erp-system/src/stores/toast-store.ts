import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

export type Toast = {
    id: number;
    type: ToastType;
    message: string;
};

type ToastState = {
    toasts: Toast[];
    show: (toast: Omit<Toast, 'id'>) => void;
    dismiss: (id: number) => void;
    clear: () => void;
};

const MAX_TOASTS = 3;
// Un error se lee con más calma que una confirmación de que algo salió bien.
const DURATION_MS: Record<ToastType, number> = {
    success: 3000,
    info: 4000,
    error: 5000,
};

// Los timers no son estado de la UI: viven fuera del store y se limpian al cerrar cada aviso.
const timers = new Map<number, ReturnType<typeof setTimeout>>();
let nextId = 1;

function clearTimer(id: number) {
    const timer = timers.get(id);
    if (timer !== undefined) {
        clearTimeout(timer);
        timers.delete(id);
    }
}

/**
 * Avisos breves (toasts) de toda la app. Es estado del cliente: lo muestra ToastHost, montado
 * una sola vez en el layout raíz. Se usa con showToast/showErrorToast desde cualquier lado.
 */
export const useToastStore = create<ToastState>((set, get) => ({
    toasts: [],

    show: ({ type, message }) => {
        // El mismo aviso repetido (p. ej. dos toques seguidos) no se apila: reinicia su tiempo.
        const repeated = get().toasts.find((toast) => toast.type === type && toast.message === message);
        const id = repeated?.id ?? nextId++;

        clearTimer(id);
        timers.set(id, setTimeout(() => get().dismiss(id), DURATION_MS[type]));

        if (repeated) return;

        set((state) => {
            const toasts = [...state.toasts, { id, type, message }];
            // Los más viejos salen primero cuando se pasa del máximo.
            for (const old of toasts.slice(0, Math.max(0, toasts.length - MAX_TOASTS))) {
                clearTimer(old.id);
            }
            return { toasts: toasts.slice(-MAX_TOASTS) };
        });
    },

    dismiss: (id) => {
        clearTimer(id);
        set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
    },

    clear: () => {
        for (const timer of timers.values()) {
            clearTimeout(timer);
        }
        timers.clear();
        set({ toasts: [] });
    },
}));

export function showToast(toast: Omit<Toast, 'id'>) {
    useToastStore.getState().show(toast);
}

/** Aviso de error con el mensaje del backend (ya en español) o uno genérico. */
export function showErrorToast(error: unknown, fallback: string) {
    showToast({ type: 'error', message: error instanceof Error && error.message ? error.message : fallback });
}
