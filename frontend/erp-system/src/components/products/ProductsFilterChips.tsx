import { ScrollView, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

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
                contentContainerStyle={SharedStyles.filterListContent}
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

                <View style={SharedStyles.filterDivider} />

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

    filterGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
});