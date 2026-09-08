import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { ORDER_STATUS_LABELS, Order } from '@/types/order';

import { getStatusBadgeColor } from '@/utils/status';

interface OrderHeaderProps {
    order: Order;
}

export function OrderHeader({ order }: OrderHeaderProps) {
    const statusBadge = getStatusBadgeColor(order.status);

    const handleBack = () => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/orders');
        }
    };

    return (
        <View style={styles.header}>
            <Pressable
                onPress={handleBack}
                style={({ pressed }) => [
                    styles.backButton,
                        pressed && SharedStyles.pressed,
                ]}
            >
                <SymbolView
                    name={{
                        ios: 'chevron.left',
                        android: 'arrow_back',
                        web: 'arrow_back',
                    }}
                    size={24}
                    tintColor={Colors.text}
                />
            </Pressable>

            <Text style={styles.headerTitle}>{order.orderNumber}</Text>

            <View
                style={[
                    styles.statusBadge,
                    {
                        backgroundColor: statusBadge.bg,
                    },
                ]}
            >
                <Text
                    style={[
                        styles.statusBadgeText,
                        {
                            color: statusBadge.text,
                        },
                    ]}
                >
                    {ORDER_STATUS_LABELS[order.status]}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },

    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
    },

    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },

    statusBadge: {
        paddingHorizontal: Spacing.sm + 2,
        paddingVertical: 4,
        borderRadius: 8,
    },

    statusBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
});
