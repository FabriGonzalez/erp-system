import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderCard } from '@/components/orders/OrderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useBranchStore } from '@/stores/branch-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';
import { Order } from '@/types/order';

const FILTERS: { label: string; value: 'ALL' | 'SALES' | 'SHIPMENTS' }[] = [
    { label: 'Todas', value: 'ALL' },
    { label: 'Ventas', value: 'SALES' },
    { label: 'Envíos', value: 'SHIPMENTS' },
];

export default function OperationsScreen() {
    const activeBranch = useBranchStore((state) => state.activeBranch);
    const orders = useOrderStore((state) => state.orders);
    const [filter, setFilter] = useState<'ALL' | 'SALES' | 'SHIPMENTS'>('ALL');

    const filteredOrders = useMemo(() => orders.filter((order) => {
        if (activeBranch && order.branchId !== activeBranch.id) return false;
        if (filter === 'SALES') return order.deliveryType !== 'SHIPPING';
        if (filter === 'SHIPMENTS') return order.deliveryType === 'SHIPPING';
        return true;
    }), [orders, activeBranch, filter]);

    function handleOpen(order: Order) {
        router.push({ pathname: '/operations/[id]', params: { id: order.id } });
    }

    return (
        <Screen style={styles.screen}>
            <View style={styles.topBar}>
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
                <Text style={styles.screenTitle}>Operaciones</Text>
            </View>

            <View style={SharedStyles.content}>
                <View style={styles.filters}>
                    {FILTERS.map((item) => (
                        <Pressable
                            key={item.value}
                            style={[styles.filter, filter === item.value && styles.filterActive]}
                            onPress={() => setFilter(item.value)}
                        >
                            <Text style={[styles.filterText, filter === item.value && styles.filterTextActive]}>
                                {item.label}
                            </Text>
                        </Pressable>
                    ))}
                </View>
                <FlatList
                    data={filteredOrders}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <OrderCard order={item} onPress={() => handleOpen(item)} />}
                    contentContainerStyle={filteredOrders.length === 0 ? SharedStyles.listEmpty : styles.list}
                    ListEmptyComponent={<EmptyState title="No hay operaciones" description="No encontramos ventas ni envíos para este filtro." />}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: { padding: 0 },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
    backButton: { padding: Spacing.xs, borderRadius: 8, marginRight: Spacing.sm },
    screenTitle: { fontSize: 22, fontWeight: '700', color: Colors.text },
    filters: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
    filter: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
    filterActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    filterText: { color: Colors.textSecondary, fontWeight: '600' },
    filterTextActive: { color: Colors.white },
    list: { gap: Spacing.sm, paddingBottom: Spacing.lg },
});
