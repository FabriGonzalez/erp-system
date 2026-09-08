import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCustomerStore } from '@/stores/customer-store';
import { SharedStyles } from '@/styles/shared';

export default function CustomerDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const getCustomerById = useCustomerStore(
        (state) => state.getCustomerById,
    );

    const customers = useCustomerStore((state) => state.customers);

    const customer = id
        ? customers.find((item) => item.id === id)
        : undefined;

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

    const initials = customer.name
        .split(' ')
        .map((name) => name[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <Screen style={styles.screen}>
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [
                        styles.backButton,
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

                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
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
                                {customer.addresses.length === 0
                                    ? 'No hay direcciones registradas'
                                    : `${customer.addresses.length} ${customer.addresses.length === 1
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

                    {customer.addresses.length === 0 ? (
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
                            {customer.addresses.map((address) => (
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

                                    <View style={styles.addressInfo}>
                                        <Text style={styles.addressLabel}>
                                            {address.label}
                                        </Text>

                                        <Text style={styles.addressStreet}>
                                            {address.street} {address.number}
                                        </Text>

                                        <Text style={styles.addressCity}>
                                            {address.city},{' '}
                                            {address.province}
                                            {address.zipCode
                                                ? ` (${address.zipCode})`
                                                : ''}
                                        </Text>
                                    </View>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
    },
    headerTitle: {
        flex: 1,
        marginLeft: Spacing.sm,
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    headerSpacer: {
        width: 32,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
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
    addressInfo: {
        flex: 1,
    },
    addressLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 3,
    },
    addressStreet: {
        fontSize: 14,
        color: Colors.text,
    },
    addressCity: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
});