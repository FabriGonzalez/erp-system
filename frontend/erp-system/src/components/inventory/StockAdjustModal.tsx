import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
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
        <Modal visible animationType="fade" transparent onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Ajustar stock</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <SymbolView
                                name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
                                size={22}
                                tintColor={Colors.textSecondary}
                            />
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={styles.body}>
                        <Text style={styles.label}>Producto / variante</Text>
                        <Text style={styles.value}>{stock.productName} · {stock.productVariantSku}</Text>

                        <Text style={styles.label}>Sucursal</Text>
                        <Text style={styles.value}>{stock.branchName}</Text>

                        <Text style={styles.label}>Nueva cantidad (hoy {stock.quantity})</Text>
                        <AppInput
                            value={quantity}
                            onChangeText={(value) => setQuantity(value.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                            placeholder="0"
                        />

                        <Text style={styles.label}>Motivo</Text>
                        <AppInput
                            value={reason}
                            onChangeText={setReason}
                            placeholder="Ej. Conteo físico"
                        />

                        {error ? <Text style={styles.error}>{error}</Text> : null}

                        <View style={styles.actions}>
                            <Pressable onPress={onClose} style={styles.cancelButton} disabled={isSubmitting}>
                                <Text style={styles.cancelText}>Cancelar</Text>
                            </Pressable>
                            <AppButton
                                title={isSubmitting ? 'Guardando...' : 'Guardar ajuste'}
                                onPress={() => void handleSubmit()}
                                disabled={isSubmitting}
                                style={styles.submitButton}
                            />
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.lg },
    content: { backgroundColor: Colors.surface, borderRadius: 16, maxHeight: '90%' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
    title: { fontSize: 18, fontWeight: '700', color: Colors.text },
    closeButton: { padding: 4 },
    body: { padding: Spacing.lg },
    label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginTop: Spacing.md, marginBottom: Spacing.xs },
    value: { fontSize: 15, color: Colors.text },
    error: { color: Colors.error, marginTop: Spacing.sm, fontSize: 13 },
    actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.xl },
    cancelButton: { padding: Spacing.md },
    cancelText: { color: Colors.textSecondary, fontWeight: '500' },
    submitButton: { flex: 1 },
});
