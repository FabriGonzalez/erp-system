import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
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
import { useCustomer, useCustomerAddresses } from '@/hooks/use-customer';
import { SharedStyles } from '@/styles/shared';
import { getInitials } from '@/utils/format';

export default function CustomerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { customer, error, notFound, isLoading, reload } = useCustomer(id);
    // Solo las activas: la gestión de inactivas llega con la edición de direcciones.
    const {
        addresses,
        error: addressesError,
        isLoading: addressesLoading,
        reload: reloadAddresses,
    } = useCustomerAddresses(id, { activeOnly: true });

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

    const initials = getInitials(customer.name);

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

                <View style={SharedStyles.headerSpacer} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={SharedStyles.listContent}
            >
                <View style={styles.customerCard}>
                    <Avatar
                        name={customer.name}
                        initials={initials || 'C'}
                        size={64}
                        fontWeight="700"
                        fontSize={22}
                        style={styles.avatar}
                    />

                    <Text style={styles.customerName}>
                        {customer.name}
                    </Text>

                    {customer.email ? (
                        <View style={styles.contactRow}>
                            <SymbolView
                                name={{
                                    ios: 'envelope',
                                    android: 'email',
                                    web: 'email',
                                }}
                                size={17}
                                tintColor={Colors.textSecondary}
                            />
                            <Text style={styles.contactText}>
                                {customer.email}
                            </Text>
                        </View>
                    ) : null}

                    {customer.phone ? (
                        <View style={styles.contactRow}>
                            <SymbolView
                                name={{
                                    ios: 'phone',
                                    android: 'phone',
                                    web: 'phone',
                                }}
                                size={17}
                                tintColor={Colors.textSecondary}
                            />
                            <Text style={styles.contactText}>
                                {customer.phone}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View>
                            <Text style={styles.sectionTitle}>
                                Direcciones
                            </Text>
                            <Text style={styles.sectionSubtitle}>
                                {customer.addressCount === 0
                                    ? 'No hay direcciones registradas'
                                    : `${customer.addressCount} ${customer.addressCount === 1
                                        ? 'dirección registrada'
                                        : 'direcciones registradas'
                                    }`}
                            </Text>
                        </View>

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
                    </View>

                    {addressesLoading && addresses.length === 0 ? (
                        <ActivityIndicator color={Colors.primary} style={styles.addressesLoader} />
                    ) : addressesError && addresses.length === 0 ? (
                        <View style={styles.emptyAddresses}>
                            <Text style={styles.emptyDescription}>{addressesError}</Text>
                            <Pressable onPress={reloadAddresses} style={styles.retryLink}>
                                <Text style={styles.retryLinkText}>Reintentar</Text>
                            </Pressable>
                        </View>
                    ) : addresses.length === 0 ? (
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
                            {addresses.map((address) => (
                                <View
                                    key={address.id}
                                    style={styles.addressCard}
                                >
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
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>
        </Screen>
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
    customerCard: {
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.xl,
    },
    avatar: {
        marginBottom: Spacing.md,
    },
    customerName: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
        textAlign: 'center',
        marginBottom: Spacing.md,
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
    section: {
        marginTop: Spacing.xl,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.md,
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