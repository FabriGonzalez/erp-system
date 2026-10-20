import { create } from 'zustand';

export type DialogOptionStyle = 'default' | 'cancel' | 'destructive';

export type DialogOption<T> = {
    label: string;
    value: T;
    style?: DialogOptionStyle;
};

type DialogRequest = {
    id: number;
    title: string;
    message: string;
    options: DialogOption<unknown>[];
    resolve: (value: unknown) => void;
};

type DialogState = {
    // El primero es el que se ve; los demás esperan su turno.
    queue: DialogRequest[];
    answer: (id: number, value: unknown) => void;
    dismissAll: () => void;
};

let nextId = 1;

/**
 * Confirmaciones y elecciones de toda la app (reemplazan a Alert.alert y window.confirm, que en
 * web no se ven o se ven distinto). Las muestra DialogHost, montado en el layout raíz.
 */
export const useDialogStore = create<DialogState>((set, get) => ({
    queue: [],

    answer: (id, value) => {
        const request = get().queue.find((item) => item.id === id);
        if (!request) return;
        set((state) => ({ queue: state.queue.filter((item) => item.id !== id) }));
        request.resolve(value);
    },

    // Al cerrar o expirar la sesión: lo que estaba pendiente se da por cancelado.
    dismissAll: () => {
        const pending = get().queue;
        set({ queue: [] });
        for (const request of pending) {
            request.resolve(null);
        }
    },
}));

/**
 * Pide al usuario que elija una opción. Resuelve con su value, o null si cierra el diálogo
 * sin elegir (botón atrás de Android, Escape en web) o si la sesión termina.
 */
export function chooseAction<T>({ title, message, options }: {
    title: string;
    message: string;
    options: DialogOption<T>[];
}): Promise<T | null> {
    return new Promise((resolve) => {
        const request: DialogRequest = {
            id: nextId++,
            title,
            message,
            options,
            resolve: (value) => resolve(value as T | null),
        };
        useDialogStore.setState((state) => ({ queue: [...state.queue, request] }));
    });
}
