import { useState } from 'react';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { FormField } from '@/components/ui/FormField';
import { ModalCard } from '@/components/ui/ModalCard';
import { useAdjustStock } from '@/hooks/use-stock-queries';
import { Stock } from '@/types/stock';

type StockAdjustModalProps = {
    /** Stock que se ajusta: la variante y la sucursal quedan fijas. */
    stock: Stock;
    onClose: () => void;
};

/**
 * Ajuste del stock de una variante en una sucursal a una cantidad final. Se monta al abrirlo:
 * el formulario parte de la cantidad actual y una recarga del stock no pisa lo tipeado.
 */
export function StockAdjustModal({ stock, onClose }: StockAdjustModalProps) {
    const adjustStock = useAdjustStock();
    const [quantity, setQuantity] = useState(() => stock.quantity.toString());
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const isSubmitting = adjustStock.isPending;

    async function handleSubmit() {
        setError(null);
        const parsedQuantity = Number(quantity);

        if (!quantity.trim() || !Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
            setError('La nueva cantidad debe ser un entero no negativo.');
            return;
        }
        if (!reason.trim()) {
            setError('El motivo es obligatorio.');
            return;
        }

        try {
            await adjustStock.mutateAsync({
                productVariantId: Number(stock.productVariantId),
                branchId: Number(stock.branchId),
                newQuantity: parsedQuantity,
                reason: reason.trim(),
            });
            onClose();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'No se pudo ajustar el stock.');
        }
    }

    return (
        <ModalCard
            title="Ajustar stock"
            subtitle={`${stock.productName} · ${stock.productVariantSku} · ${stock.branchName}`}
            onClose={onClose}
            closeDisabled={isSubmitting}
            error={error}
            footer={[
                <AppButton key="cancel" title="Cancelar" variant="secondary" onPress={onClose} disabled={isSubmitting} />,
                <AppButton
                    key="save"
                    title={isSubmitting ? 'Guardando...' : 'Guardar ajuste'}
                    onPress={() => void handleSubmit()}
                    disabled={isSubmitting}
                />,
            ]}
        >
            <FormField label="Nueva cantidad" hint={`Hoy hay ${stock.quantity}. Va la cantidad final, no la diferencia.`}>
                <AppInput
                    value={quantity}
                    onChangeText={(value) => setQuantity(value.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    placeholder="0"
                    editable={!isSubmitting}
                />
            </FormField>

            <FormField label="Motivo">
                <AppInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Ej. Conteo físico"
                    editable={!isSubmitting}
                />
            </FormField>
        </ModalCard>
    );
}
