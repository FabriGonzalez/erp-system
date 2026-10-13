import { Alert, Platform } from 'react-native';

type ConfirmOptions = {
    title: string;
    message: string;
    confirmLabel: string;
    // Marca la acción como destructiva (rojo en iOS).
    destructive?: boolean;
};

/**
 * Pide confirmación y resuelve true si el usuario acepta. En web Alert.alert no muestra
 * nada, así que ahí se usa window.confirm (mismo criterio que use-order-actions).
 */
export function confirmAction({ title, message, confirmLabel, destructive = false }: ConfirmOptions): Promise<boolean> {
    if (Platform.OS === 'web') {
        return Promise.resolve(window.confirm(`${title}\n\n${message}`));
    }

    return new Promise((resolve) => {
        Alert.alert(
            title,
            message,
            [
                { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
                {
                    text: confirmLabel,
                    style: destructive ? 'destructive' : 'default',
                    onPress: () => resolve(true),
                },
            ],
            { cancelable: true, onDismiss: () => resolve(false) },
        );
    });
}
