import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

type StockFilter = 'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK';
type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

interface ProductsFilterChipsProps {
    stockFilter: StockFilter;
    statusFilter: StatusFilter;
    onStockChange: (value: StockFilter) => void;
    onStatusChange: (value: StatusFilter) => void;
}

export function ProductsFilterChips({
    stockFilter,
    statusFilter,
    onStockChange,
    onStatusChange,
}: ProductsFilterChipsProps) {
    return (
        <View style={styles.filterSection}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
            >
                <View style={styles.filterGroup}>
                    <FilterChip
                        label="Stock: Todos"
                        selected={stockFilter === 'ALL'}
                        onPress={() => onStockChange('ALL')}
                    />
                    <FilterChip
                        label="Con stock"
                        selected={stockFilter === 'IN_STOCK'}
                        onPress={() => onStockChange('IN_STOCK')}
                    />
                    <FilterChip
                        label="Sin stock"
                        selected={stockFilter === 'OUT_OF_STOCK'}
                        onPress={() => onStockChange('OUT_OF_STOCK')}
                    />
                </View>

                <View style={styles.filterDivider} />

                <View style={styles.filterGroup}>
                    <FilterChip
                        label="Estado: Todos"
                        selected={statusFilter === 'ALL'}
                        onPress={() => onStatusChange('ALL')}
                    />
                    <FilterChip
                        label="Activos"
                        selected={statusFilter === 'ACTIVE'}
                        onPress={() => onStatusChange('ACTIVE')}
                    />
                    <FilterChip
                        label="Inactivos"
                        selected={statusFilter === 'INACTIVE'}
                        onPress={() => onStatusChange('INACTIVE')}
                    />
                </View>
            </ScrollView>
        </View>
    );
}

function FilterChip({
    label,
    selected,
    onPress,
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
}) {
    return (
        <Pressable
            style={({ pressed }) => [
                styles.chip,
                selected && styles.chipActive,
                pressed && SharedStyles.pressed,
            ]}
            onPress={onPress}
        >
            <Text
                style={[
                    styles.chipText,
                    selected && styles.chipTextActive,
                ]}
            >
                {label}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    filterSection: {
        marginBottom: Spacing.xs,
    },

    filterScroll: {
        paddingHorizontal: Spacing.lg,
        alignItems: 'center',
    },

    filterGroup: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },

    filterDivider: {
        width: 1,
        height: 20,
        backgroundColor: Colors.border,
        marginHorizontal: Spacing.sm,
    },

    chip: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    chipActive: {
        backgroundColor: '#EFF6FF',
        borderColor: Colors.primary,
    },

    chipText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
    },

    chipTextActive: {
        color: Colors.primary,
        fontWeight: '600',
    },
});
