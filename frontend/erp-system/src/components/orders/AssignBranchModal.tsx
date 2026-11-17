import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { ModalCard } from '@/components/ui/ModalCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { useMyBranches } from '@/hooks/use-branch-queries';
import { useAssignOrderBranch } from '@/hooks/use-order-queries';
import { useCompanyVariantStocks } from '@/hooks/use-stock-queries';
import { useCreateTransfer } from '@/hooks/use-transfer-queries';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
import { Order } from '@/types/order';
import { Stock } from '@/types/stock';
import {
    assignmentOptions,
    BranchOption,
    NeededLine,
    neededLines,
    sameTransfers,
} from '@/utils/branch-assignment';
import { hasPermission } from '@/utils/permissions';

type AssignBranchModalProps = {
    order: Order;
    onClose: () => void;
};

function errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
}

function describe(lines: NeededLine[]): string {
    return lines.map((line) => `${line.quantity} × ${line.label}`).join(', ');
}

/**
 * Elegir la sucursal que arma un pedido web pagado. Muestra qué le falta a cada una y de dónde
 * traerlo; "Transferir y asignar" hace las transferencias y asigna, después de volver a leer el
 * stock para no ejecutar una sugerencia vieja.
 */
export function AssignBranchModal({ order, onClose }: AssignBranchModalProps) {
    const user = useAuthStore((state) => state.user);
    const canTransfer = hasPermission(user, 'TRANSFERIR_STOCK');
    const { branches, isLoading: branchesLoading, error: branchesError } = useMyBranches();
    const needed = neededLines(order);
    const stockQuery = useCompanyVariantStocks(needed.map((line) => line.variantId));
    const createTransfer = useCreateTransfer();
    const assign = useAssignOrderBranch();
    const [busyBranchId, setBusyBranchId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const myBranchIds = new Set(branches.map((branch) => branch.id));
    const optionsFor = (stocks: Stock[]) =>
        assignmentOptions(needed, stocks, branches, order.branchId, myBranchIds);
    const options = stockQuery.stocks ? optionsFor(stockQuery.stocks) : [];
    const isLoading = branchesLoading || stockQuery.isLoading;

    // Después de un error se relee el stock para mostrar la sugerencia al día; si eso también
    // falla, queda el error original.
    async function reloadQuietly() {
        try {
            await stockQuery.reload();
        } catch {
            // El error que importa ya está en pantalla.
        }
    }

    async function handleAssign(option: BranchOption) {
        if (busyBranchId) return;
        setBusyBranchId(option.branchId);
        setError(null);
        setNotice(null);

        try {
            let fresh: Stock[];
            try {
                fresh = await stockQuery.reload();
            } catch (e) {
                setError(errorMessage(e, 'No se pudo leer el stock. Probá de nuevo.'));
                return;
            }

            // Si alguien vendió o movió stock desde que se abrió el modal, no se ejecuta.
            const current = optionsFor(fresh).find((candidate) => candidate.branchId === option.branchId);
            const stillValid = current
                && current.fulfills === option.fulfills
                && sameTransfers(current.transfers, option.transfers)
                && (current.fulfills || current.canTransferFromMine);
            if (!current || !stillValid) {
                setNotice('El stock cambió mientras tanto. Revisá la nueva sugerencia antes de seguir.');
                return;
            }

            const done: string[] = [];
            try {
                for (const transfer of current.transfers) {
                    await createTransfer.mutateAsync({
                        originBranchId: transfer.originBranchId,
                        destinationBranchId: current.branchId,
                        items: transfer.items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
                    });
                    done.push(transfer.originBranchName);
                }
            } catch (e) {
                await reloadQuietly();
                const partial = done.length > 0
                    ? ` Ya se hizo la transferencia desde ${done.join(', ')}.`
                    : '';
                setError(`${errorMessage(e, 'No se pudo hacer la transferencia.')}${partial} Revisá la nueva sugerencia.`);
                return;
            }

            try {
                await assign.mutateAsync({ id: order.id, branchId: current.branchId });
            } catch (e) {
                await reloadQuietly();
                const prefix = done.length > 0
                    ? 'Las transferencias se hicieron, pero no se pudo asignar la sucursal: '
                    : '';
                setError(`${prefix}${errorMessage(e, 'No se pudo asignar la sucursal.')}`);
                return;
            }

            showToast({ type: 'success', message: `Pedido asignado a ${current.branchName}` });
            onClose();
        } finally {
            setBusyBranchId(null);
        }
    }

    return (
        <ModalCard
            title="Asignar sucursal"
            subtitle={`Pedido #${order.orderNumber} · elegí la sucursal que lo arma`}
            onClose={onClose}
            closeDisabled={busyBranchId !== null}
            error={error ?? stockQuery.error ?? branchesError}
        >
            {notice ? <Text style={styles.notice}>{notice}</Text> : null}
            {isLoading ? (
                <ActivityIndicator size="large" color={Colors.primary} style={styles.loading} />
            ) : options.length === 0 ? (
                <Text style={styles.text}>No tenés sucursales asignadas para armar este pedido.</Text>
            ) : (
                <View style={styles.options}>
                    {options.map((option) => (
                        <OptionCard
                            key={option.branchId}
                            option={option}
                            canTransfer={canTransfer}
                            busy={busyBranchId === option.branchId}
                            disabled={busyBranchId !== null || stockQuery.isFetching}
                            onAssign={() => void handleAssign(option)}
                        />
                    ))}
                </View>
            )}
        </ModalCard>
    );
}

function OptionCard({ option, canTransfer, busy, disabled, onAssign }: {
    option: BranchOption;
    canTransfer: boolean;
    busy: boolean;
    disabled: boolean;
    onAssign: () => void;
}) {
    const executable = option.fulfills || (canTransfer && option.canTransferFromMine);
    const label = option.fulfills ? 'Asignar' : 'Transferir y asignar';

    return (
        <View style={[styles.option, option.recommended && styles.optionRecommended]}>
            <View style={styles.header}>
                <Text style={styles.name} numberOfLines={1}>{option.branchName}</Text>
                {option.recommended ? <StatusPill label="Recomendada" tone="success" /> : null}
                {option.isProvisional ? <StatusPill label="Prioritaria" tone="neutral" /> : null}
            </View>

            {option.fulfills ? (
                <Text style={styles.text}>Tiene todo el stock del pedido.</Text>
            ) : (
                <>
                    <Text style={styles.text}>Le falta: {describe(option.missing)}</Text>
                    {option.transfers.map((transfer) => (
                        <Text key={transfer.originBranchId} style={styles.text}>
                            Traer de {transfer.originBranchName}: {describe(transfer.items)}
                        </Text>
                    ))}
                    {option.uncovered.length > 0 ? (
                        <Text style={styles.warning}>
                            No alcanza ni con el stock de toda la empresa: faltan {describe(option.uncovered)}.
                        </Text>
                    ) : !executable ? (
                        <Text style={styles.hint}>
                            {canTransfer
                                ? 'Hay que traer stock de sucursales que no tenés asignadas: pedile a alguien de esas sucursales que haga la transferencia.'
                                : 'No tenés permiso para transferir stock: pedile a alguien que haga la transferencia.'}
                        </Text>
                    ) : null}
                </>
            )}

            {executable ? (
                <Pressable
                    style={[option.recommended ? SharedStyles.buttonPrimary : SharedStyles.buttonSecondary, disabled && styles.disabled]}
                    onPress={onAssign}
                    disabled={disabled}
                    accessibilityRole="button"
                    accessibilityLabel={`${label} en ${option.branchName}`}
                >
                    {busy ? (
                        <ActivityIndicator color={option.recommended ? Colors.white : Colors.primary} />
                    ) : (
                        <Text style={option.recommended ? SharedStyles.buttonPrimaryText : SharedStyles.buttonSecondaryText}>
                            {label}
                        </Text>
                    )}
                </Pressable>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    loading: {
        paddingVertical: Spacing.xxl,
    },
    options: {
        gap: Spacing.md,
    },
    option: {
        gap: Spacing.sm,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.lg,
    },
    optionRecommended: {
        borderColor: Colors.success,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    name: {
        flexShrink: 1,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        marginRight: Spacing.xs,
    },
    text: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    warning: {
        fontSize: 13,
        color: Colors.error,
    },
    hint: {
        fontSize: 13,
        color: Colors.warningDark,
    },
    notice: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.warningDark,
        marginBottom: Spacing.md,
    },
    disabled: {
        opacity: 0.6,
    },
});
