import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { TransferStatusBadge } from '@/components/transfers/TransferStatusBadge';
import { ErrorState } from '@/components/ui/ErrorState';
import { InfoRow } from '@/components/ui/InfoRow';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { MenuListItem } from '@/components/ui/MenuListItem';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
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
            <ScrollView contentContainerStyle={SharedStyles.pageContent} showsVerticalScrollIndicator={false}>
                <View style={SharedStyles.pageSection}>
                    <SectionHeader title="Recorrido" />
                    <ListGroup>
                        <InfoRow label="Origen" value={transfer.originBranchName} />
                        <InfoRow label="Destino" value={transfer.destinationBranchName} />
                        <InfoRow label="Fecha" value={formatDateTime(transfer.createdAt)} />
                        <InfoRow label="Hecha por" value={transfer.createdByUsername} />
                        <InfoRow label="Estado" value={<TransferStatusBadge status={transfer.status} />} />
                    </ListGroup>
                </View>

                <View style={SharedStyles.pageSection}>
                    <SectionHeader
                        title={`Productos (${transfer.totalUnits} ${transfer.totalUnits === 1 ? 'unidad' : 'unidades'})`}
                    />
                    <ListGroup>
                        {transfer.items.map((item) => (
                            <View key={item.id} style={styles.itemRow}>
                                <View style={SharedStyles.listItemTexts}>
                                    <Text style={styles.itemName}>{item.productName}</Text>
                                    <Text style={SharedStyles.listItemMeta}>SKU {item.sku}</Text>
                                </View>
                                <Text style={styles.itemQuantity}>× {item.quantity}</Text>
                            </View>
                        ))}
                    </ListGroup>
                </View>

                {cancelError && <Text style={styles.errorText}>{cancelError}</Text>}

                {canCancel && (
                    <View style={SharedStyles.pageSection}>
                        <SectionHeader title="Acciones" />
                        <ListGroup>
                            <MenuListItem
                                title={cancelTransfer.isPending ? 'Anulando...' : 'Anular transferencia'}
                                subtitle={`Las unidades vuelven a ${transfer.originBranchName}`}
                                iconName={{ ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' }}
                                danger
                                showChevron={false}
                                onPress={() => void handleCancel()}
                            />
                        </ListGroup>
                    </View>
                )}
            </ScrollView>
        );
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow="Transferencia"
                title={`#${id}`}
            />

            {renderBody()}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md + 2,
        backgroundColor: Colors.surface,
    },
    itemName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    itemQuantity: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.text,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
    },
});
