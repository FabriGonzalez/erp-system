import { ScrollView, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

import { FilterChip } from '@/components/ui/FilterChip';

import {
    DELIVERY_TYPE_LABELS,
    ORDER_STATUS_LABELS,
    OrderDeliveryFilter,
    OrderStatusFilter,
} from '@/types/order';

const STATUS_FILTERS: {
    label: string;
    value: OrderStatusFilter;
}[] = [
        { label: 'Todos', value: 'ALL' },
        { label: ORDER_STATUS_LABELS.DRAFT, value: 'DRAFT' },
        { label: ORDER_STATUS_LABELS.CONFIRMED, value: 'CONFIRMED' },
        { label: ORDER_STATUS_LABELS.IN_PREPARATION, value: 'IN_PREPARATION' },
        { label: ORDER_STATUS_LABELS.READY_TO_SHIP, value: 'READY_TO_SHIP' },
        { label: ORDER_STATUS_LABELS.SHIPPED, value: 'SHIPPED' },
        { label: ORDER_STATUS_LABELS.DELIVERED, value: 'DELIVERED' },
        { label: ORDER_STATUS_LABELS.CANCELLED, value: 'CANCELLED' },
    ];

const DELIVERY_FILTERS: {
    label: string;
    value: OrderDeliveryFilter;
}[] = [
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
        <View style={styles.filterSection}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContent}
            >
                <View style={styles.filterGroup}>
                    {STATUS_FILTERS.map((item) => (
                        <FilterChip
                            key={item.value}
                            label={item.label}
                            selected={statusFilter === item.value}
                            onPress={() => onStatusChange(item.value)}
                        />
                    ))}
                </View>

                <View style={styles.filterDivider} />

                <View style={styles.filterGroup}>
                    {DELIVERY_FILTERS.map((item) => (
                        <FilterChip
                            key={item.value}
                            label={item.label}
                            selected={deliveryTypeFilter === item.value}
                            onPress={() => onDeliveryChange(item.value)}
                        />
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    filterSection: {
        marginBottom: Spacing.xs,
    },

    filtersContent: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs + 2,
        alignItems: 'center',
    },

    filterGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },

    filterDivider: {
        width: 1,
        height: 20,
        backgroundColor: Colors.border,
        marginHorizontal: Spacing.sm,
    },
});