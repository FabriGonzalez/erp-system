import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { SalesType } from '@/types/order';

type OrderSalesTypeSectionProps = {
    salesType: SalesType;
    onChangeSalesType: (type: SalesType) => void;
    disabled?: boolean;
};

export function OrderSalesTypeSection({
    salesType,
    onChangeSalesType,
    disabled = false,
}: OrderSalesTypeSectionProps) {
    return (
        <View style={styles.container}>
            <Text style={SharedStyles.sectionTitle}>Tipo de Venta</Text>

            <View style={styles.options}>
                <Pressable
                    style={[
                        styles.option,
                        salesType === 'WITH_PRODUCTS' && styles.optionActive,
                    ]}
                    onPress={() => !disabled && onChangeSalesType('WITH_PRODUCTS')}
                >
                    <Text
                        style={[
                            styles.optionText,
                            salesType === 'WITH_PRODUCTS' && styles.optionTextActive,
                        ]}
                    >
                        Con productos
                    </Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.option,
                        salesType === 'QUICK_SALE' && styles.optionActive,
                    ]}
                    onPress={() => !disabled && onChangeSalesType('QUICK_SALE')}
                >
                    <Text
                        style={[
                            styles.optionText,
                            salesType === 'QUICK_SALE' && styles.optionTextActive,
                        ]}
                    >
                        Venta rápida
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
    },
    options: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    option: {
        flex: 1,
        height: 46,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
    },
    optionActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    optionText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    optionTextActive: {
        color: Colors.white,
    },
});
