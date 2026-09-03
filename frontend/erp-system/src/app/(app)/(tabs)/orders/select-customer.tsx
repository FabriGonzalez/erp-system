import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCustomerStore } from '@/stores/customer-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';
import { Customer, CUSTOMER_ANONYMOUS } from '@/types/customer';

export default function SelectCustomerScreen() {
    const { customers, searchQuery, setSearchQuery } = useCustomerStore();
    const setDraftCustomer = useOrderDraftStore((state) => state.setCustomer);
    const currentCustomer = useOrderDraftStore((state) => state.customer);

    const filteredCustomers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return customers;

        return customers.filter((c) => {
            const matchesName = c.name.toLowerCase().includes(query);
            const matchesEmail = c.email?.toLowerCase().includes(query) ?? false;
            const matchesPhone = c.phone?.includes(query) ?? false;
            return matchesName || matchesEmail || matchesPhone;
        });
    }, [customers, searchQuery]);

    function handleSelectCustomer(customer: Customer) {
        setDraftCustomer(customer);
        router.back();
    }

    function handleCreateNewCustomer() {
        router.push({
            pathname: '/customers/new',
            params: { fromOrder: 'true' },
        });
    }

    return (
        <Screen style={styles.screen}>
            {/* Header */}
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={SharedStyles.headerTitle}>Seleccionar Cliente</Text>
                <Pressable
                    onPress={handleCreateNewCustomer}
                    style={({ pressed }) => [styles.newBtn, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'plus', android: 'add', web: 'add' }}
                        size={18}
                        tintColor={Colors.primary}
                    />
                    <Text style={styles.newBtnText}>Nuevo</Text>
                </Pressable>
            </View>

            {/* Búsqueda */}
            <View style={styles.searchBox}>
                <AppInput
                    placeholder="Buscar cliente por nombre, email o teléfono..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filteredCustomers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.headerComponent}>
                        {/* Opción Consumidor final siempre disponible */}
                        <Pressable
                            style={({ pressed }) => [
                                styles.anonymousCard,
                                currentCustomer.id === CUSTOMER_ANONYMOUS.id && styles.selectedCard,
                                pressed && SharedStyles.pressed,
                            ]}
                            onPress={() => handleSelectCustomer(CUSTOMER_ANONYMOUS)}
                        >
                            <View style={styles.anonymousAvatar}>
                                <SymbolView
                                    name={{ ios: 'person.fill.questionmark', android: 'person', web: 'person' }}
                                    size={20}
                                    tintColor={Colors.primary}
                                />
                            </View>
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle}>{CUSTOMER_ANONYMOUS.name}</Text>
                                <Text style={styles.cardSub}>Sin registro de comprador (venta genérica)</Text>
                            </View>
                            {currentCustomer.id === CUSTOMER_ANONYMOUS.id && (
                                <SymbolView
                                    name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                                    size={20}
                                    tintColor={Colors.primary}
                                />
                            )}
                        </Pressable>

                        <Text style={styles.listSectionTitle}>Clientes registrados</Text>
                    </View>
                }
                ListEmptyComponent={
                    <EmptyState
                        title="No se encontraron clientes"
                        description="Intenta con otro término o crea un nuevo cliente."
                        actionLabel="+ Nuevo cliente"
                        onAction={handleCreateNewCustomer}
                    />
                }
                renderItem={({ item }) => {
                    const isSelected = currentCustomer.id === item.id;
                    const addrCount = item.addresses.length;

                    return (
                        <Pressable
                            style={({ pressed }) => [
                                styles.customerCard,
                                isSelected && styles.selectedCard,
                                pressed && SharedStyles.pressed,
                            ]}
                            onPress={() => handleSelectCustomer(item)}
                        >
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {item.name
                                        ? item.name
                                            .split(' ')
                                            .map((n) => n[0])
                                            .join('')
                                            .slice(0, 2)
                                            .toUpperCase()
                                        : 'C'}
                                </Text>
                            </View>

                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle}>{item.name}</Text>
                                {item.email ? <Text style={styles.cardSub}>{item.email}</Text> : null}
                                {item.phone ? <Text style={styles.cardSub}>{item.phone}</Text> : null}
                                <Text style={styles.cardAddrBadge}>
                                    {addrCount === 0
                                        ? 'Sin direcciones'
                                        : addrCount === 1
                                            ? '1 dirección'
                                            : `${addrCount} direcciones`}
                                </Text>
                            </View>

                            {isSelected && (
                                <SymbolView
                                    name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                                    size={20}
                                    tintColor={Colors.primary}
                                />
                            )}
                        </Pressable>
                    );
                }}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
        backgroundColor: Colors.background,
    },
    newBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingHorizontal: Spacing.xs,
        paddingVertical: 4,
    },
    newBtnText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    searchBox: {
        padding: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    listContainer: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
    },
    headerComponent: {
        marginBottom: Spacing.md,
    },
    anonymousCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.lg,
    },
    anonymousAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    listSectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: Spacing.xs,
    },
    customerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.sm,
    },
    selectedCard: {
        borderColor: Colors.primary,
        backgroundColor: '#F0F9FF',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },
    cardInfo: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    cardSub: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 1,
    },
    cardAddrBadge: {
        fontSize: 11,
        color: Colors.textSecondary,
        marginTop: 4,
    },
});
