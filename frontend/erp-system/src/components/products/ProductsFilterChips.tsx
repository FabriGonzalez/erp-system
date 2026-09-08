import { ScrollView, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

import { FilterChip } from '@/components/ui/FilterChip';
import { StatusFilter, StockFilter } from '@/types/product';

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

const styles = StyleSheet.create({
    filterSection: {
        marginBottom: Spacing.xs,
    },

    filterScroll: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs + 2, // <--- Evita el recorte vertical de los chips
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