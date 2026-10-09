import { useState } from 'react';
import { Alert, Platform } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';
import { useOrderStore } from '@/stores/order-store';
import { Order, RefundAction } from '@/types/order';

function askRefundAction(): Promise<RefundAction | null> {
    if (Platform.OS === 'web') {
        const refund = window.confirm(
            'El pedido tiene pagos registrados. Aceptar para reembolsar el dinero; Cancelar para dejarlo como crédito del cliente.'
        );
        return Promise.resolve(refund ? 'REFUND_MONEY' : 'KEEP_AS_CREDIT');
    }

    return new Promise((resolve) => {
        Alert.alert(
            'Cancelar pedido',
            'El pedido tiene pagos registrados. ¿Qué hacemos con ese dinero?',
            [
                { text: 'Volver', style: 'cancel', onPress: () => resolve(null) },
                { text: 'Dejar como crédito', onPress: () => resolve('KEEP_AS_CREDIT') },
                { text: 'Reembolsar', onPress: () => resolve('REFUND_MONEY') },
            ],
            { cancelable: true, onDismiss: () => resolve(null) }
        );
    });
}

export function useOrderActions(
    onSuccess: (message: string) => void,
    successMessages: { cancel: string; dispatch: string }
) {
    const token = useAuthStore((state) => state.token);
    const cancelOrder = useOrderStore((state) => state.cancelOrder);
    const dispatchOrder = useOrderStore((state) => state.dispatchOrder);
    const [isBusy, setIsBusy] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function run(action: () => Promise<unknown>, message: string) {
        setIsBusy(true);
        setErrorMessage(null);

        try {
            await action();
            onSuccess(message);
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'No se pudo completar la operación.'
            );
        } finally {
            setIsBusy(false);
        }
    }

    async function handleCancel(order: Order) {
        if (!token || isBusy) return;

        let refundAction: RefundAction | undefined;

        if (order.amountPaid > 0) {
            const answer = await askRefundAction();
            if (!answer) return;
            refundAction = answer;
        }

        await run(
            () => cancelOrder(order.id, token, refundAction),
            successMessages.cancel
        );
    }

    async function handleDispatch(order: Order) {
        if (!token || isBusy) return;

        await run(() => dispatchOrder(order.id, token), successMessages.dispatch);
    }

    return { isBusy, errorMessage, handleCancel, handleDispatch };
}
