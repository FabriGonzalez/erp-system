import { useState } from 'react';

import { chooseAction } from '@/stores/dialog-store';
import { showToast } from '@/stores/toast-store';
import { Order, RefundAction } from '@/types/order';
import { confirmAction } from '@/utils/confirm';

import { useCancelOrder, useDispatchOrder } from './use-order-queries';

/** Con pagos registrados, qué se hace con ese dinero al cancelar; null si vuelve atrás. */
function askRefundAction(): Promise<RefundAction | null> {
    return chooseAction<RefundAction | null>({
        title: 'Cancelar pedido',
        message: 'El pedido tiene pagos registrados. ¿Qué hacemos con ese dinero?',
        options: [
            { label: 'Volver', value: null, style: 'cancel' },
            { label: 'Dejar como crédito del cliente', value: 'KEEP_AS_CREDIT' },
            { label: 'Reembolsar el dinero', value: 'REFUND_MONEY', style: 'destructive' },
        ],
    });
}

export function useOrderActions(successMessages: { cancel: string; dispatch: string }) {
    const cancelOrder = useCancelOrder();
    const dispatchOrder = useDispatchOrder();
    const [isBusy, setIsBusy] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    async function run(action: () => Promise<unknown>, message: string) {
        setIsBusy(true);
        setErrorMessage(null);

        try {
            await action();
            showToast({ type: 'success', message });
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : 'No se pudo completar la operación.'
            );
        } finally {
            setIsBusy(false);
        }
    }

    async function handleCancel(order: Order) {
        if (isBusy) return;

        let refundAction: RefundAction | undefined;

        // Cancelar no se puede deshacer: siempre se confirma. Con pagos, la elección de qué
        // hacer con el dinero ya es la confirmación.
        if (order.amountPaid > 0) {
            const answer = await askRefundAction();
            if (!answer) return;
            refundAction = answer;
        } else {
            const confirmed = await confirmAction({
                title: 'Cancelar pedido',
                message: `El pedido ${order.orderNumber} queda cancelado: se devuelve el stock y, si tiene cliente, `
                    + 'se revierte el cargo en su cuenta corriente. No se puede deshacer.',
                confirmLabel: 'Cancelar pedido',
                cancelLabel: 'Volver',
                destructive: true,
            });
            if (!confirmed) return;
        }

        await run(
            () => cancelOrder.mutateAsync({ id: order.id, refundAction }),
            successMessages.cancel
        );
    }

    async function handleDispatch(order: Order) {
        if (isBusy) return;

        await run(() => dispatchOrder.mutateAsync(order.id), successMessages.dispatch);
    }

    return { isBusy, errorMessage, handleCancel, handleDispatch };
}
