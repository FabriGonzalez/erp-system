import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';

import { AddressSummary } from '@/components/customers/AddressSummary';
import { ActionChip } from '@/components/ui/ActionChip';
import { ErrorState } from '@/components/ui/ErrorState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { IconBadge } from '@/components/ui/IconBadge';
import { InfoRow } from '@/components/ui/InfoRow';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { MenuListItem } from '@/components/ui/MenuListItem';
import { NotFound } from '@/components/ui/NotFound';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import {
    useCustomer,
    useCustomerAddresses,
    useSetAddressActive,
    useSetCustomerActive,
    useUpdateAddress,
} from '@/hooks/use-customer-queries';
import { useCustomerAccountSummaryQuery } from '@/hooks/use-customer-account-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { CustomerAddress, documentTypeLabel } from '@/types/customer';
import { addressToDraft, toAddressRequest } from '@/utils/address';
import { confirmAction } from '@/utils/confirm';
import { formatCurrency } from '@/utils/format';
import { CUSTOMER_ACCOUNT_READ_PERMISSIONS, hasAnyPermission, hasPermission } from '@/utils/permissions';

export default function CustomerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const customerId = id ?? '';
    const user = useAuthStore((state) => state.user);
    // Mismos permisos que exige el backend para cada acción.
    const canManageCustomers = hasPermission(user, 'ADMINISTRAR_CLIENTES');
    const canEditAddresses = canManageCustomers || hasPermission(user, 'CREAR_PEDIDOS');
    const canViewAccount = hasAnyPermission(user, CUSTOMER_ACCOUNT_READ_PERMISSIONS);

    const { customer, error, notFound, isLoading, reload } = useCustomer(id);
    const { summary, isLoading: summaryLoading } = useCustomerAccountSummaryQuery(id, canViewAccount);
    const {
        addresses,
        error: addressesError,
        isLoading: addressesLoading,
        reload: reloadAddresses,
    } = useCustomerAddresses(id);

    const setCustomerActive = useSetCustomerActive(customerId);
    const updateAddress = useUpdateAddress(customerId);
    const setAddressActive = useSetAddressActive(customerId);

    const [showInactive, setShowInactive] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);
    // Una acción de dirección a la vez: evita que dos cambios de principal se crucen.
    const isAddressBusy = updateAddress.isPending || setAddressActive.isPending;

    if (!customer && isLoading) {
        return (
            <Screen>
                <LoadingState label="Cargando cliente..." />
            </Screen>
        );
    }

    if (!customer && error && !notFound) {
        return (
            <Screen>
                <ErrorState message={error} onRetry={reload} />
            </Screen>
        );
    }

    if (!customer) {
        return (
            <NotFound
                headerTitle="Cliente"
                title="Cliente no encontrado"
                description="El cliente que intentás consultar no existe o ya no está disponible."
                iconName={{
                    ios: 'person.crop.circle.badge.exclamationmark',
                    android: 'person_off',
                    web: 'person_off',
                }}
            />
        );
    }

    const inactiveCount = addresses.filter((address) => !address.active).length;
    const visibleAddresses = showInactive ? addresses : addresses.filter((address) => address.active);
    const documentLabel = customer.documentNumber
        ? `${documentTypeLabel(customer.documentType) ?? 'Doc.'} ${customer.documentNumber}`
        : null;

    async function runAction(action: () => Promise<unknown>) {
        setActionError(null);
        try {
            await action();
        } catch (actionFailure: unknown) {
            setActionError(actionFailure instanceof Error ? actionFailure.message : 'No se pudo completar la acción.');
        }
    }

    async function handleToggleCustomerActive() {
        if (!customer || setCustomerActive.isPending) return;

        const deactivating = customer.active;
        const confirmed = await confirmAction(
            deactivating
                ? {
                    title: 'Desactivar cliente',
                    message: `${customer.name} no va a aparecer para nuevas ventas ni envíos. Sus pedidos y su cuenta corriente se conservan.`,
                    confirmLabel: 'Desactivar',
                    destructive: true,
                }
                : {
                    title: 'Reactivar cliente',
                    message: `${customer.name} va a volver a estar disponible para nuevas ventas y envíos.`,
                    confirmLabel: 'Reactivar',
                },
        );
        if (confirmed) {
            await runAction(() => setCustomerActive.mutateAsync(!deactivating));
        }
    }

    async function handleSetMain(address: CustomerAddress) {
        if (isAddressBusy) return;
        // El PATCH reemplaza todos los campos: se manda la dirección completa más mainAddress.
        await runAction(() => updateAddress.mutateAsync({
            addressId: address.id,
            data: toAddressRequest(addressToDraft(address), true),
        }));
    }

    async function handleToggleAddressActive(address: CustomerAddress) {
        if (isAddressBusy) return;

        if (address.active) {
            const confirmed = await confirmAction({
                title: 'Desactivar dirección',
                message: address.isMain
                    ? 'Es la dirección principal: la próxima dirección activa pasa a serlo.'
                    : 'No se va a poder elegir para nuevos envíos.',
                confirmLabel: 'Desactivar',
                destructive: true,
            });
            if (!confirmed) return;
        }

        await runAction(() => setAddressActive.mutateAsync({ addressId: address.id, active: !address.active }));
    }

    const accountPill = summary
        ? summary.debt > 0
            ? <StatusPill label={`Debe ${formatCurrency(summary.debt)}`} tone="danger" />
            : summary.credit > 0
                ? <StatusPill label={`A favor ${formatCurrency(summary.credit)}`} tone="success" />
                : <StatusPill label="Al día" tone="success" />
        : summaryLoading
            ? <ActivityIndicator size="small" color={Colors.primary} />
            : undefined;

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow="Cliente"
                title={customer.name}
                right={canManageCustomers ? (
                    <HeaderButton
                        label="Editar"
                        icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                        accessibilityLabel="Editar cliente"
                        onPress={() =>
                            router.push({
                                pathname: '/customers/[id]/edit',
                                params: { id: customer.id },
                            })
                        }
                    />
                ) : undefined}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={SharedStyles.pageContent}
            >
                {actionError ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorBoxText}>{actionError}</Text>
                    </View>
                ) : null}

                {!customer.active ? <StatusPill label="Inactivo" tone="neutral" /> : null}

                {documentLabel || customer.email || customer.phone || customer.observations ? (
                    <View style={SharedStyles.pageSection}>
                        <SectionHeader title="Contacto" />
                        <ListGroup>
                            {documentLabel ? <InfoRow label="Documento" value={documentLabel} /> : null}
                            {customer.email ? <InfoRow label="Email" value={customer.email} /> : null}
                            {customer.phone ? <InfoRow label="Teléfono" value={customer.phone} /> : null}
                            {customer.observations ? (
                                <Text style={styles.observations}>{customer.observations}</Text>
                            ) : null}
                        </ListGroup>
                    </View>
                ) : null}

                {canViewAccount ? (
                    <ListGroup>
                        <MenuListItem
                            title="Cuenta corriente"
                            subtitle={summary && summary.pendingOrders > 0
                                ? `${summary.pendingOrders} ${summary.pendingOrders === 1
                                    ? 'pedido con saldo pendiente'
                                    : 'pedidos con saldo pendiente'}`
                                : 'Pendientes, pagos y movimientos'}
                            iconName={{ ios: 'creditcard', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
                            tone="warning"
                            badge={accountPill}
                            onPress={() =>
                                router.push({
                                    pathname: '/customers/[id]/debts',
                                    params: { id: customer.id },
                                })
                            }
                        />
                    </ListGroup>
                ) : null}

                <View style={SharedStyles.pageSection}>
                    <SectionHeader
                        title={customer.addressCount === 0
                            ? 'Direcciones'
                            : `Direcciones (${customer.addressCount} ${customer.addressCount === 1 ? 'activa' : 'activas'})`}
                        actionLabel={canEditAddresses ? 'Agregar' : undefined}
                        onAction={canEditAddresses
                            ? () =>
                                router.push({
                                    pathname: '/customers/[id]/add-address',
                                    params: { id: customer.id },
                                })
                            : undefined}
                    />

                    {inactiveCount > 0 ? (
                        <View style={styles.toggleRow}>
                            <Text style={styles.toggleLabel}>
                                Mostrar inactivas ({inactiveCount})
                            </Text>
                            <Switch
                                value={showInactive}
                                onValueChange={setShowInactive}
                                trackColor={{ true: Colors.primary, false: Colors.track }}
                                thumbColor={Colors.white}
                            />
                        </View>
                    ) : null}

                    {addressesLoading && addresses.length === 0 ? (
                        <ActivityIndicator color={Colors.primary} style={styles.addressesLoader} />
                    ) : addressesError && addresses.length === 0 ? (
                        <View style={[SharedStyles.card, styles.emptyAddresses]}>
                            <Text style={styles.emptyDescription}>{addressesError}</Text>
                            <Pressable onPress={reloadAddresses} style={styles.retryLink}>
                                <Text style={styles.retryLinkText}>Reintentar</Text>
                            </Pressable>
                        </View>
                    ) : visibleAddresses.length === 0 ? (
                        <View style={[SharedStyles.card, styles.emptyAddresses]}>
                            <IconBadge
                                icon={{ ios: 'mappin.slash', android: 'location_off', web: 'location_off' }}
                                tone="neutral"
                            />
                            <Text style={styles.emptyTitle}>
                                Sin direcciones
                            </Text>
                            <Text style={styles.emptyDescription}>
                                Agregá una dirección para poder realizar
                                pedidos con envío a este cliente.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.addressList}>
                            {visibleAddresses.map((address) => (
                                <View
                                    key={address.id}
                                    style={[SharedStyles.card, styles.addressCard, !address.active && SharedStyles.listItemInactive]}
                                >
                                    <View style={styles.addressRow}>
                                        <IconBadge
                                            icon={{ ios: 'mappin', android: 'location_on', web: 'location_on' }}
                                            tone={address.isMain ? 'primary' : 'neutral'}
                                        />
                                        <AddressSummary address={address} />
                                    </View>

                                    {canEditAddresses ? (
                                        <View style={styles.addressActions}>
                                            {address.active ? (
                                                <ActionChip
                                                    label="Editar"
                                                    icon={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                                                    disabled={isAddressBusy}
                                                    onPress={() =>
                                                        router.push({
                                                            pathname: '/customers/[id]/addresses/[addressId]/edit',
                                                            params: { id: customer.id, addressId: address.id },
                                                        })
                                                    }
                                                />
                                            ) : null}
                                            {address.active && !address.isMain ? (
                                                <ActionChip
                                                    label="Marcar principal"
                                                    icon={{ ios: 'star', android: 'star', web: 'star' }}
                                                    tone="neutral"
                                                    disabled={isAddressBusy}
                                                    onPress={() => handleSetMain(address)}
                                                />
                                            ) : null}
                                            {canManageCustomers ? (
                                                <ActionChip
                                                    label={address.active ? 'Desactivar' : 'Reactivar'}
                                                    icon={address.active
                                                        ? { ios: 'pause.circle', android: 'block', web: 'block' }
                                                        : { ios: 'play.circle', android: 'check_circle', web: 'check_circle' }}
                                                    tone={address.active ? 'danger' : 'success'}
                                                    disabled={isAddressBusy}
                                                    onPress={() => handleToggleAddressActive(address)}
                                                />
                                            ) : null}
                                        </View>
                                    ) : null}
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {canManageCustomers ? (
                    <View style={SharedStyles.pageSection}>
                        <SectionHeader title="Acciones" />
                        <ListGroup>
                            <MenuListItem
                                title={customer.active ? 'Desactivar cliente' : 'Reactivar cliente'}
                                subtitle={customer.active
                                    ? 'No aparece para nuevas ventas; se conservan sus pedidos'
                                    : 'Vuelve a estar disponible para vender'}
                                iconName={customer.active
                                    ? { ios: 'person.crop.circle.badge.xmark', android: 'person_off', web: 'person_off' }
                                    : { ios: 'person.crop.circle.badge.checkmark', android: 'how_to_reg', web: 'how_to_reg' }}
                                tone="success"
                                danger={customer.active}
                                showChevron={false}
                                badge={setCustomerActive.isPending
                                    ? <ActivityIndicator size="small" color={Colors.primary} />
                                    : undefined}
                                onPress={() => void handleToggleCustomerActive()}
                            />
                        </ListGroup>
                    </View>
                ) : null}
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    errorBox: {
        backgroundColor: Colors.errorLight,
        borderWidth: 1,
        borderColor: Colors.errorBorder,
        borderRadius: Radius.sm,
        padding: Spacing.md,
    },
    errorBoxText: {
        color: Colors.error,
        fontSize: 13,
    },
    observations: {
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md + 2,
        fontSize: 13,
        lineHeight: 19,
        color: Colors.textSecondary,
        fontStyle: 'italic',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    toggleLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    emptyAddresses: {
        alignItems: 'center',
        padding: Spacing.xl,
    },
    emptyTitle: {
        marginTop: Spacing.sm,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    emptyDescription: {
        marginTop: Spacing.xs,
        fontSize: 13,
        lineHeight: 19,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    addressList: {
        gap: Spacing.sm,
    },
    addressCard: {
        padding: Spacing.md,
        gap: Spacing.md,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    addressActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    addressesLoader: {
        paddingVertical: Spacing.lg,
    },
    retryLink: {
        marginTop: Spacing.sm,
    },
    retryLinkText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
});
