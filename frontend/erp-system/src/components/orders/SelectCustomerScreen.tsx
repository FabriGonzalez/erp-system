import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppInput } from '@/components/ui/AppInput';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCustomerStore } from '@/stores/customer-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';
import { Customer, CUSTOMER_ANONYMOUS } from '@/types/customer';
import { getInitials } from '@/utils/format';

type CustomerFlow = 'orders' | 'shipments';

type SelectCustomerScreenProps = {
    flow: CustomerFlow;
};

export function SelectCustomerScreen({ flow }: SelectCustomerScreenProps) {
    const { allowAnonymous } = useLocalSearchParams<{ allowAnonymous?: string }>();
    const canSelectAnonymous = allowAnonymous !== 'false';
    const { customers, searchQuery, setSearchQuery } = useCustomerStore();
    const setDraftCustomer = useOrderDraftStore((state) => state.setCustomer);
    const currentCustomer = useOrderDraftStore((state) => state.customer);
    const newCustomerRoute = flow === 'shipments'
        ? '/shipments/new-customers'
        : '/orders/new-customers';

    const filteredCustomers = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return customers;

        return customers.filter((customer) => {
            const matchesName = customer.name.toLowerCase().includes(query);
            const matchesEmail = customer.email?.toLowerCase().includes(query) ?? false;
            const matchesPhone = customer.phone?.includes(query) ?? false;
            return matchesName || matchesEmail || matchesPhone;
        });
    }, [customers, searchQuery]);

    function handleSelectCustomer(customer: Customer) {
        setDraftCustomer(customer);
        router.back();
    }

    function handleCreateNewCustomer() {
        router.push(newCustomerRoute);
    }

    return (
        <Screen style={styles.screen}>
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}
                >
                    <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={24} tintColor={Colors.text} />
                </Pressable>
                <Text style={SharedStyles.headerTitle}>Seleccionar Cliente</Text>
                <Pressable
                    onPress={handleCreateNewCustomer}
                    style={({ pressed }) => [styles.newBtn, pressed && SharedStyles.pressed]}
                >
                    <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={18} tintColor={Colors.primary} />
                    <Text style={styles.newBtnText}>Nuevo</Text>
                </Pressable>
            </View>

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
                        {canSelectAnonymous && (
                            <Pressable
                                style={({ pressed }) => [
                                    SharedStyles.rowCard,
                                    styles.anonymousCard,
                                    currentCustomer.id === CUSTOMER_ANONYMOUS.id && styles.selectedCard,
                                    pressed && SharedStyles.pressed,
                                ]}
                                onPress={() => handleSelectCustomer(CUSTOMER_ANONYMOUS)}
                            >
                                <Avatar backgroundColor={Colors.primaryLight} style={styles.anonymousAvatar}>
                                    <SymbolView name={{ ios: 'person.fill.questionmark', android: 'person', web: 'person' }} size={20} tintColor={Colors.primary} />
                                </Avatar>
                                <View style={styles.cardInfo}>
                                    <Text style={styles.cardTitle}>{CUSTOMER_ANONYMOUS.name}</Text>
                                    <Text style={styles.cardSub}>Sin registro de comprador (venta genérica)</Text>
                                </View>
                                {currentCustomer.id === CUSTOMER_ANONYMOUS.id && (
                                    <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={20} tintColor={Colors.primary} />
                                )}
                            </Pressable>
                        )}
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
                    const addressCount = item.addresses.length;

                    return (
                        <Pressable
                            style={({ pressed }) => [
                                SharedStyles.rowCard,
                                styles.customerCard,
                                isSelected && styles.selectedCard,
                                pressed && SharedStyles.pressed,
                            ]}
                            onPress={() => handleSelectCustomer(item)}
                        >
                            <Avatar
                                name={item.name}
                                initials={item.name ? getInitials(item.name) : 'C'}
                                backgroundColor={Colors.muted}
                                textColor={Colors.text}
                                fontWeight="700"
                                fontSize={14}
                                style={styles.avatar}
                            />
                            <View style={styles.cardInfo}>
                                <Text style={styles.cardTitle}>{item.name}</Text>
                                {item.email ? <Text style={styles.cardSub}>{item.email}</Text> : null}
                                {item.phone ? <Text style={styles.cardSub}>{item.phone}</Text> : null}
                                <Text style={styles.cardAddrBadge}>
                                    {addressCount === 0 ? 'Sin direcciones' : addressCount === 1 ? '1 dirección' : `${addressCount} direcciones`}
                                </Text>
                            </View>
                            {isSelected && (
                                <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={20} tintColor={Colors.primary} />
                            )}
                        </Pressable>
                    );
                }}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: { padding: 0, backgroundColor: Colors.background },
    newBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: Spacing.xs, paddingVertical: 4 },
    newBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
    searchBox: { padding: Spacing.lg, paddingBottom: Spacing.sm },
    listContainer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
    headerComponent: { marginBottom: Spacing.md },
    anonymousCard: { marginBottom: Spacing.lg },
    anonymousAvatar: { marginRight: Spacing.md },
    listSectionTitle: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
    customerCard: { marginBottom: Spacing.sm },
    selectedCard: { borderColor: Colors.primary, backgroundColor: Colors.selected },
    avatar: { marginRight: Spacing.md },
    cardInfo: { flex: 1 },
    cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
    cardSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 1 },
    cardAddrBadge: { fontSize: 11, color: Colors.textSecondary, marginTop: 4 },
});
