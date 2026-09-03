import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

import {
    DELIVERY_TYPE_LABELS,
    ORDER_STATUS_LABELS,
    OrderDeliveryFilter,
    OrderStatusFilter,
} from '@/types/order';

const STATUS_FILTERS: { label: string; value: OrderStatusFilter }[] = [
    { label: 'Todos', value: 'ALL' },
    { label: ORDER_STATUS_LABELS.DRAFT, value: 'DRAFT' },
    { label: ORDER_STATUS_LABELS.CONFIRMED, value: 'CONFIRMED' },
    { label: ORDER_STATUS_LABELS.IN_PREPARATION, value: 'IN_PREPARATION' },
    { label: ORDER_STATUS_LABELS.READY_TO_SHIP, value: 'READY_TO_SHIP' },
    { label: ORDER_STATUS_LABELS.SHIPPED, value: 'SHIPPED' },
    { label: ORDER_STATUS_LABELS.DELIVERED, value: 'DELIVERED' },
    { label: ORDER_STATUS_LABELS.CANCELLED, value: 'CANCELLED' },
];

const DELIVERY_FILTERS: { label: string; value: OrderDeliveryFilter }[] = [
    { label: 'Todos', value: 'ALL' },
    { label: DELIVERY_TYPE_LABELS.LOCAL_PICKUP, value: 'LOCAL_PICKUP' },
    { label: DELIVERY_TYPE_LABELS.SHIPPING, value: 'SHIPPING' },
];

interface OrdersFilterListProps {
    statusFilter: OrderStatusFilter;
    deliveryTypeFilter: OrderDeliveryFilter;
    onStatusChange: (value: OrderStatusFilter) => void;
    onDeliveryChange: (value: OrderDeliveryFilter) => void;
}

export function OrdersFilterList({
    statusFilter,
    deliveryTypeFilter,
    onStatusChange,
    onDeliveryChange,
}: OrdersFilterListProps) {
    return (
        <>
            <View style={styles.filtersSection}>
                <Text style={styles.filterTitle}>Estado</Text>

                <FlatList
                    horizontal
                    data={STATUS_FILTERS}
                    keyExtractor={(item) => item.value}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersContent}
                    renderItem={({ item }) => {
                        const selected = statusFilter === item.value;

                        return (
                            <Pressable
                                onPress={() => onStatusChange(item.value)}
                                style={({ pressed }) => [
                                    SharedStyles.filterChip,
                                    selected && SharedStyles.filterChipSelected,
                                    pressed && SharedStyles.pressed,
                                ]}
                            >
                                <Text
                                    style={[
                                        SharedStyles.filterChipText,
                                        selected && SharedStyles.filterChipTextSelected,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </Pressable>
                        );
                    }}
                />
            </View>

            <View style={styles.filtersSection}>
                <Text style={styles.filterTitle}>Entrega</Text>

                <FlatList
                    horizontal
                    data={DELIVERY_FILTERS}
                    keyExtractor={(item) => item.value}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersContent}
                    renderItem={({ item }) => {
                        const selected = deliveryTypeFilter === item.value;

                        return (
                            <Pressable
                                onPress={() => onDeliveryChange(item.value)}
                                style={({ pressed }) => [
                                    SharedStyles.filterChip,
                                    selected && SharedStyles.filterChipSelected,
                                    pressed && SharedStyles.pressed,
                                ]}
                            >
                                <Text
                                    style={[
                                        SharedStyles.filterChipText,
                                        selected && SharedStyles.filterChipTextSelected,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </Pressable>
                        );
                    }}
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    filtersSection: {
        marginTop: Spacing.md,
    },

    filterTitle: {
        marginHorizontal: Spacing.md,
        marginBottom: Spacing.xs,
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
    },

    filtersContent: {
        paddingHorizontal: Spacing.md,
        gap: Spacing.xs,
    },
});
