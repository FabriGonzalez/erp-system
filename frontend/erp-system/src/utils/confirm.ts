import { chooseAction } from '@/stores/dialog-store';

type ConfirmOptions = {
    title: string;
    message: string;
    confirmLabel: string;
    // Marca la acción como destructiva (botón rojo).
    destructive?: boolean;
    // Por defecto "Cancelar"; cambiarlo cuando la acción misma es cancelar algo.
    cancelLabel?: string;
};

/**
 * Pide confirmación y resuelve true si el usuario acepta. Usa el diálogo propio (DialogHost),
 * igual en web y en el celular; cerrarlo sin elegir cuenta como cancelar.
 */
export async function confirmAction({
    title,
    message,
    confirmLabel,
    destructive = false,
    cancelLabel = 'Cancelar',
}: ConfirmOptions): Promise<boolean> {
    const answer = await chooseAction({
        title,
        message,
        options: [
            { label: cancelLabel, value: false, style: 'cancel' },
            { label: confirmLabel, value: true, style: destructive ? 'destructive' : 'default' },
        ],
    });
    return answer === true;
}
