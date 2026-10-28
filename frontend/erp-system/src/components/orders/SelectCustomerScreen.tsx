import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppInput } from '@/components/ui/AppInput';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCustomerList } from '@/hooks/use-customer-queries';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';
import { Customer, CUSTOMER_ANONYMOUS } from '@/types/customer';
import { getInitials } from '@/utils/format';
import { CUSTOMER_PICKER_ROUTES, OrderCreationFlow } from '@/utils/order-routes';

type SelectCustomerScreenProps = {
    flow: OrderCreationFlow;
};

export function SelectCustomerScreen({ flow }: SelectCustomerScreenProps) {
    const { allowAnonymous } = useLocalSearchParams<{ allowAnonymous?: string }>();
    const canSelectAnonymous = allowAnonymous !== 'false';
    const [searchQuery, setSearchQuery] = useState('');
    // Propio de esta pantalla: no pisa la búsqueda del listado de clientes.
    const {
        customers,
        isInitialLoading,
        isLoadingMore,
        error,
        loadMore,
        refresh,
    } = useCustomerList({ query: searchQuery, status: 'active' });
    const setDraftCustomer = useOrderDraftStore((state) => state.setCustomer);
    const currentCustomer = useOrderDraftStore((state) => state.customer);
    const newCustomerRoute = CUSTOMER_PICKER_ROUTES[flow].newCustomer;

    function handleSelectCustomer(customer: Customer) {
        setDraftCustomer(customer);
        router.back();
    }

    function handleCreateNewCustomer() {
        router.push(newCustomerRoute);
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                title="Elegir cliente"
                right={<HeaderButton label="Nuevo" accessibilityLabel="Nuevo cliente" onPress={handleCreateNewCustomer} />}
            />

            <View style={styles.searchBox}>
                <AppInput
                    placeholder="Buscar por nombre, teléfono, email o documento..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
            </View>

            <FlatList
                data={customers}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    isLoadingMore ? <ActivityIndicator style={styles.footerLoader} color={Colors.primary} /> : null
                }
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
                    isInitialLoading ? (
                        <LoadingState label="Buscando clientes..." />
                    ) : error ? (
                        <EmptyState
                            title="No se pudieron cargar los clientes"
                            description={error}
                            actionLabel="Reintentar"
                            onAction={refresh}
                        />
                    ) : (
                        <EmptyState
                            title="No se encontraron clientes"
                            description="Intenta con otro término o crea un nuevo cliente."
                            actionLabel="+ Nuevo cliente"
                            onAction={handleCreateNewCustomer}
                        />
                    )
                }
                renderItem={({ item }) => {
                    const isSelected = currentCustomer.id === item.id;
                    const addressCount = item.addressCount;

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
    footerLoader: { paddingVertical: Spacing.md },
});
