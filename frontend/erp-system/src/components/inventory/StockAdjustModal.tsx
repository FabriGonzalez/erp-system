import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useStockStore } from '@/stores/stock-store';
import { Branch } from '@/types/branch';
import { Product } from '@/types/product';
import { Stock } from '@/types/stock';

type StockAdjustModalProps = {
    visible: boolean;
    stock?: Stock | null;
    branches: Branch[];
    products: Product[];
    token: string | null;
    onClose: () => void;
};

type VariantOption = {
    product: Product;
    variantId: string;
    sku: string;
};

export function StockAdjustModal({
    visible,
    stock,
    branches,
    products,
    token,
    onClose,
}: StockAdjustModalProps) {
    const adjustStock = useStockStore((state) => state.adjustStock);
    const [branchId, setBranchId] = useState('');
    const [variantId, setVariantId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [reason, setReason] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const variants = useMemo<VariantOption[]>(
        () => products.flatMap((product) => product.variants.map((variant) => ({
            product,
            variantId: variant.id,
            sku: variant.sku,
        }))),
        [products]
    );

    useEffect(() => {
        if (visible) {
            // Reset the form when opening a different stock record.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setBranchId(stock?.branchId ?? branches[0]?.id ?? '');
            setVariantId(stock?.productVariantId ?? variants[0]?.variantId ?? '');
            setQuantity(stock?.quantity.toString() ?? '');
            setReason('');
            setError(null);
        }
    }, [branches, stock, variants, visible]);

    async function handleSubmit() {
        setError(null);
        const parsedQuantity = Number(quantity);
        const parsedBranchId = Number(branchId);
        const parsedVariantId = Number(variantId);

        if (!token) {
            setError('No hay una sesión activa.');
            return;
        }
        if (!quantity.trim() || !Number.isInteger(parsedQuantity) || parsedQuantity < 0) {
            setError('La nueva cantidad debe ser un entero no negativo.');
            return;
        }
        if (!Number.isInteger(parsedBranchId) || !Number.isInteger(parsedVariantId)) {
            setError('Seleccioná una variante y una sucursal válidas.');
            return;
        }
        if (!reason.trim()) {
            setError('El motivo es obligatorio.');
            return;
        }

        setIsSubmitting(true);
        try {
            await adjustStock({
                productVariantId: parsedVariantId,
                branchId: parsedBranchId,
                newQuantity: parsedQuantity,
                reason: reason.trim(),
            }, token);
            onClose();
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'No se pudo ajustar el stock.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
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
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
                            {variants.map((variant) => (
                                <Pressable
                                    key={variant.variantId}
                                    onPress={() => setVariantId(variant.variantId)}
                                    style={[styles.option, variant.variantId === variantId && styles.selectedOption]}
                                >
                                    <Text style={[styles.optionText, variant.variantId === variantId && styles.selectedOptionText]}>
                                        {variant.product.name} · {variant.sku}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Sucursal</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.options}>
                            {branches.map((branch) => (
                                <Pressable
                                    key={branch.id}
                                    onPress={() => setBranchId(branch.id)}
                                    style={[styles.option, branch.id === branchId && styles.selectedOption]}
                                >
                                    <Text style={[styles.optionText, branch.id === branchId && styles.selectedOptionText]}>
                                        {branch.name}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Nueva cantidad</Text>
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
                                title="Guardar ajuste"
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
    options: { gap: Spacing.sm },
    option: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, maxWidth: 260 },
    selectedOption: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
    optionText: { color: Colors.textSecondary, fontSize: 13 },
    selectedOptionText: { color: Colors.primary, fontWeight: '600' },
    error: { color: Colors.error, marginTop: Spacing.sm, fontSize: 13 },
    actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.xl },
    cancelButton: { padding: Spacing.md },
    cancelText: { color: Colors.textSecondary, fontWeight: '500' },
    submitButton: { flex: 1 },
});
