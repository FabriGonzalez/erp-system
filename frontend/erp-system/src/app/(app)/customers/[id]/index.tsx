import { router, useLocalSearchParams } from 'expo-router';
import { AndroidSymbol, SFSymbol, SymbolView } from 'expo-symbols';
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
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import {
    useCustomer,
    useCustomerAddresses,
    useSetAddressActive,
    useSetCustomerActive,
    useUpdateAddress,
} from '@/hooks/use-customer-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { CustomerAddress, documentTypeLabel } from '@/types/customer';
import { addressToDraft, toAddressRequest } from '@/utils/address';
import { confirmAction } from '@/utils/confirm';
import { getInitials } from '@/utils/format';
import { hasPermission } from '@/utils/permissions';

export default function CustomerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const customerId = id ?? '';
    const user = useAuthStore((state) => state.user);
    // Mismos permisos que exige el backend para cada acción.
    const canManageCustomers = hasPermission(user, 'ADMINISTRAR_CLIENTES');
    const canEditAddresses = canManageCustomers || hasPermission(user, 'CREAR_PEDIDOS');

    const { customer, error, notFound, isLoading, reload } = useCustomer(id);
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

    return (
        <Screen style={styles.screen}>
            <View style={[SharedStyles.header, styles.header]}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [
                        SharedStyles.backButton,
                        pressed && SharedStyles.pressed,
                    ]}
                >
                    <SymbolView
                        name={{
                            ios: 'chevron.left',
                            android: 'arrow_back',
                            web: 'arrow_back',
                        }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>

                <Text style={styles.headerTitle}>
                    Detalle del cliente
                </Text>

                {canManageCustomers ? (
                    <Pressable
                        onPress={() =>
                            router.push({
                                pathname: '/customers/[id]/edit',
                                params: { id: customer.id },
                            })
                        }
                        style={({ pressed }) => [styles.headerAction, pressed && SharedStyles.pressed]}
                    >
                        <Text style={styles.headerActionText}>Editar</Text>
                    </Pressable>
                ) : (
                    <View style={SharedStyles.headerSpacer} />
                )}
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={SharedStyles.listContent}
            >
                {actionError ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorBoxText}>{actionError}</Text>
                    </View>
                ) : null}

                <View style={[styles.customerCard, !customer.active && styles.inactiveCard]}>
                    <Avatar
                        name={customer.name}
                        initials={getInitials(customer.name) || 'C'}
                        size={64}
                        fontWeight="700"
                        fontSize={22}
                        style={styles.avatar}
                    />

                    <Text style={styles.customerName}>
                        {customer.name}
                    </Text>

                    {!customer.active ? (
                        <View style={styles.inactiveBadge}>
                            <Text style={styles.inactiveBadgeText}>Inactivo</Text>
                        </View>
                    ) : null}

                    {documentLabel ? (
                        <ContactRow icon={{ ios: 'person.text.rectangle', android: 'badge', web: 'badge' }} text={documentLabel} />
                    ) : null}
                    {customer.email ? (
                        <ContactRow icon={{ ios: 'envelope', android: 'email', web: 'email' }} text={customer.email} />
                    ) : null}
                    {customer.phone ? (
                        <ContactRow icon={{ ios: 'phone', android: 'phone', web: 'phone' }} text={customer.phone} />
                    ) : null}

                    {customer.observations ? (
                        <Text style={styles.observations}>{customer.observations}</Text>
                    ) : null}

                    {canManageCustomers ? (
                        <Pressable
                            onPress={handleToggleCustomerActive}
                            disabled={setCustomerActive.isPending}
                            style={({ pressed }) => [
                                styles.statusButton,
                                customer.active ? styles.statusButtonDanger : styles.statusButtonPrimary,
                                (pressed || setCustomerActive.isPending) && SharedStyles.pressed,
                            ]}
                        >
                            {setCustomerActive.isPending ? (
                                <ActivityIndicator size="small" color={customer.active ? Colors.error : Colors.primary} />
                            ) : (
                                <Text style={[styles.statusButtonText, { color: customer.active ? Colors.error : Colors.primary }]}>
                                    {customer.active ? 'Desactivar cliente' : 'Reactivar cliente'}
                                </Text>
                            )}
                        </Pressable>
                    ) : null}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderText}>
                            <Text style={styles.sectionTitle}>
                                Direcciones
                            </Text>
                            <Text style={styles.sectionSubtitle}>
                                {customer.addressCount === 0
                                    ? 'No hay direcciones activas'
                                    : `${customer.addressCount} ${customer.addressCount === 1
                                        ? 'dirección activa'
                                        : 'direcciones activas'
                                    }`}
                            </Text>
                        </View>

                        {canEditAddresses ? (
                            <Pressable
                                style={({ pressed }) => [
                                    styles.addButton,
                                    pressed && SharedStyles.pressed,
                                ]}
                                onPress={() =>
                                    router.push({
                                        pathname: '/customers/[id]/add-address',
                                        params: { id: customer.id },
                                    })
                                }
                            >
                                <SymbolView
                                    name={{
                                        ios: 'plus',
                                        android: 'add',
                                        web: 'add',
                                    }}
                                    size={17}
                                    tintColor={Colors.white}
                                />
                                <Text style={styles.addButtonText}>
                                    Agregar
                                </Text>
                            </Pressable>
                        ) : null}
                    </View>

                    {inactiveCount > 0 ? (
                        <View style={styles.toggleRow}>
                            <Text style={styles.toggleLabel}>
                                Mostrar inactivas ({inactiveCount})
                            </Text>
                            <Switch
                                value={showInactive}
                                onValueChange={setShowInactive}
                                trackColor={{ true: Colors.primary, false: Colors.border }}
                            />
                        </View>
                    ) : null}

                    {addressesLoading && addresses.length === 0 ? (
                        <ActivityIndicator color={Colors.primary} style={styles.addressesLoader} />
                    ) : addressesError && addresses.length === 0 ? (
                        <View style={styles.emptyAddresses}>
                            <Text style={styles.emptyDescription}>{addressesError}</Text>
                            <Pressable onPress={reloadAddresses} style={styles.retryLink}>
                                <Text style={styles.retryLinkText}>Reintentar</Text>
                            </Pressable>
                        </View>
                    ) : visibleAddresses.length === 0 ? (
                        <View style={styles.emptyAddresses}>
                            <SymbolView
                                name={{
                                    ios: 'mappin.slash',
                                    android: 'location_off',
                                    web: 'location_off',
                                }}
                                size={24}
                                tintColor={Colors.textSecondary}
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
                                    style={[styles.addressCard, !address.active && styles.inactiveCard]}
                                >
                                    <View style={styles.addressRow}>
                                        <View style={styles.addressIcon}>
                                            <SymbolView
                                                name={{
                                                    ios: 'mappin',
                                                    android: 'location_on',
                                                    web: 'location_on',
                                                }}
                                                size={18}
                                                tintColor={Colors.primary}
                                            />
                                        </View>

                                        <AddressSummary address={address} />
                                    </View>

                                    {canEditAddresses ? (
                                        <View style={styles.addressActions}>
                                            {address.active ? (
                                                <AddressAction
                                                    label="Editar"
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
                                                <AddressAction
                                                    label="Marcar principal"
                                                    disabled={isAddressBusy}
                                                    onPress={() => handleSetMain(address)}
                                                />
                                            ) : null}
                                            {canManageCustomers ? (
                                                <AddressAction
                                                    label={address.active ? 'Desactivar' : 'Reactivar'}
                                                    destructive={address.active}
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
            </ScrollView>
        </Screen>
    );
}

function ContactRow({
    icon,
    text,
}: {
    icon: { ios: SFSymbol; android: AndroidSymbol; web: AndroidSymbol };
    text: string;
}) {
    return (
        <View style={styles.contactRow}>
            <SymbolView
                name={icon}
                size={17}
                tintColor={Colors.textSecondary}
            />
            <Text style={styles.contactText}>{text}</Text>
        </View>
    );
}

function AddressAction({
    label,
    onPress,
    disabled,
    destructive = false,
}: {
    label: string;
    onPress: () => void;
    disabled: boolean;
    destructive?: boolean;
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            hitSlop={6}
            style={({ pressed }) => [(pressed || disabled) && SharedStyles.pressed]}
        >
            <Text style={[styles.addressActionText, destructive && styles.addressActionDestructive]}>
                {label}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    header: {
        paddingHorizontal: Spacing.lg,
    },
    headerTitle: {
        flex: 1,
        marginLeft: Spacing.sm,
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    headerAction: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
    },
    headerActionText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.primary,
    },
    errorBox: {
        backgroundColor: Colors.errorLight,
        borderWidth: 1,
        borderColor: Colors.errorBorder,
        borderRadius: 8,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    errorBoxText: {
        color: Colors.error,
        fontSize: 13,
    },
    customerCard: {
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.xl,
    },
    inactiveCard: {
        opacity: 0.7,
    },
    avatar: {
        marginBottom: Spacing.md,
    },
    customerName: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.sm,
    },
    inactiveBadge: {
        backgroundColor: Colors.muted,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
        marginBottom: Spacing.sm,
    },
    inactiveBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        marginTop: Spacing.xs,
    },
    contactText: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
    observations: {
        marginTop: Spacing.md,
        fontSize: 13,
        lineHeight: 19,
        color: Colors.textSecondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    statusButton: {
        marginTop: Spacing.lg,
        minWidth: 180,
        alignItems: 'center',
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        borderRadius: 8,
        borderWidth: 1,
    },
    statusButtonDanger: {
        borderColor: Colors.error,
    },
    statusButtonPrimary: {
        borderColor: Colors.primary,
    },
    statusButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        marginTop: Spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    sectionHeaderText: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
    },
    addButtonText: {
        color: Colors.white,
        fontSize: 13,
        fontWeight: '600',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.sm,
    },
    toggleLabel: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    emptyAddresses: {
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.xl,
    },
    emptyTitle: {
        marginTop: Spacing.sm,
        fontSize: 15,
        fontWeight: '600',
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
        backgroundColor: Colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    addressIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primaryLight,
        marginRight: Spacing.md,
    },
    addressActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-end',
        gap: Spacing.lg,
        marginTop: Spacing.sm,
        paddingTop: Spacing.sm,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    addressActionText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },
    addressActionDestructive: {
        color: Colors.error,
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
