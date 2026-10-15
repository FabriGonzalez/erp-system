import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TransferStatusBadge } from '@/components/transfers/TransferStatusBadge';
import { AppButton } from '@/components/ui/AppButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCancelTransfer, useTransfer } from '@/hooks/use-transfer-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { confirmAction } from '@/utils/confirm';
import { formatDateTime } from '@/utils/format';
import { hasPermission } from '@/utils/permissions';

export default function TransferDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const user = useAuthStore((state) => state.user);
    const canTransfer = hasPermission(user, 'TRANSFERIR_STOCK');
    const { transfer, isLoading, error, reload } = useTransfer(id);
    const cancelTransfer = useCancelTransfer();
    const [cancelError, setCancelError] = useState<string | null>(null);

    async function handleCancel() {
        if (!transfer || cancelTransfer.isPending) return;

        const confirmed = await confirmAction({
            title: 'Anular transferencia',
            message:
                `Las unidades vuelven de ${transfer.destinationBranchName} a ${transfer.originBranchName}. ` +
                `${transfer.destinationBranchName} tiene que tener todavía todo lo transferido.`,
            confirmLabel: 'Anular',
            destructive: true,
        });
        if (!confirmed) return;

        setCancelError(null);
        try {
            await cancelTransfer.mutateAsync(transfer.id);
        } catch (err) {
            setCancelError(err instanceof Error ? err.message : 'No se pudo anular la transferencia.');
        }
    }

    function renderBody() {
        if (isLoading) return <LoadingState label="Cargando transferencia..." />;
        if (!transfer) {
            return <ErrorState message={error ?? 'No se encontró la transferencia.'} onRetry={reload} />;
        }

        const canCancel = canTransfer && transfer.status === 'CONFIRMED';

        return (
            <>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.card}>
                        <View style={styles.cardTopRow}>
                            <Text style={styles.cardTitle}>Recorrido</Text>
                            <TransferStatusBadge status={transfer.status} />
                        </View>
                        <BranchRow label="Origen" name={transfer.originBranchName} />
                        <BranchRow label="Destino" name={transfer.destinationBranchName} />
                        <Text style={styles.secondaryText}>
                            {formatDateTime(transfer.createdAt)} · {transfer.createdByUsername}
                        </Text>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.cardTitle}>
                            Productos ({transfer.totalUnits} {transfer.totalUnits === 1 ? 'unidad' : 'unidades'})
                        </Text>
                        {transfer.items.map((item) => (
                            <View key={item.id} style={styles.itemRow}>
                                <View style={styles.itemInfo}>
                                    <Text style={styles.itemName}>{item.productName}</Text>
                                    <Text style={styles.secondaryText}>SKU: {item.sku}</Text>
                                </View>
                                <Text style={styles.itemQuantity}>× {item.quantity}</Text>
                            </View>
                        ))}
                    </View>

                    {cancelError && <Text style={styles.errorText}>{cancelError}</Text>}
                </ScrollView>

                {canCancel && (
                    <View style={styles.footer}>
                        <AppButton
                            title={cancelTransfer.isPending ? 'Anulando...' : 'Anular transferencia'}
                            onPress={() => void handleCancel()}
                            disabled={cancelTransfer.isPending}
                            style={styles.cancelButton}
                        />
                    </View>
                )}
            </>
        );
    }

    return (
        <Screen style={styles.screen}>
            <View style={[SharedStyles.topBar, SharedStyles.topBarElevated]}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={styles.screenTitle}>Transferencia #{id}</Text>
            </View>

            {renderBody()}
        </Screen>
    );
}

function BranchRow({ label, name }: { label: string; name: string }) {
    return (
        <View style={styles.branchRow}>
            <Text style={styles.branchLabel}>{label}</Text>
            <Text style={styles.branchName}>{name}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
        marginRight: Spacing.xs,
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    branchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    branchLabel: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    branchName: {
        flexShrink: 1,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        textAlign: 'right',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.muted,
        paddingTop: Spacing.sm,
    },
    itemInfo: {
        flex: 1,
        gap: 2,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    itemQuantity: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    secondaryText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
    },
    footer: {
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    cancelButton: {
        backgroundColor: Colors.error,
    },
});
