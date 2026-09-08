import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Order, SHIPPING_STATUS_FLOW } from '@/types/order';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

type OrderTimelineProps = {
    order: Order;
};

function getCompletedAndCurrent(
    order: Order
): {
    completed: Order['status'][];
    current: Order['status'] | null;
} {
    if (order.status === 'CANCELLED') {
        return { completed: [], current: null };
    }

    if (order.deliveryType === 'LOCAL_PICKUP') {
        return {
            completed: order.status === 'CONFIRMED'
                ? ['CONFIRMED']
                : [],
            current: null,
        };
    }

    const shippingFlow: Order['status'][] = [
        'DRAFT',
        ...SHIPPING_STATUS_FLOW,
    ];

    const currentIdx = shippingFlow.indexOf(order.status);

    if (currentIdx < 0) {
        return { completed: [], current: null };
    }

    return {
        completed: shippingFlow.slice(0, currentIdx),
        current: shippingFlow[currentIdx],
    };
}

export function OrderTimeline({ order }: OrderTimelineProps) {
    const { completed, current } = getCompletedAndCurrent(order);
    const isCancelled = order.status === 'CANCELLED';

    const steps = order.deliveryType === 'LOCAL_PICKUP'
        ? ['Pedido creado', 'Confirmado']
        : ['Confirmado', 'En preparación', 'Listo para enviar', 'Enviado', 'Entregado'];

    const statusSteps: Order['status'][] =
        order.deliveryType === 'LOCAL_PICKUP'
            ? ['CONFIRMED', 'CONFIRMED']
            : ['DRAFT', ...SHIPPING_STATUS_FLOW];

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Estado del pedido</Text>

            {isCancelled && (
                <View style={styles.cancelledBanner}>
                    <SymbolView
                        name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                        size={20}
                        tintColor={Colors.error}
                    />
                    <Text style={styles.cancelledText}>Pedido cancelado</Text>
                </View>
            )}

            {steps.map((label, index) => {
                const statusKey = statusSteps[index];
                const isCompleted = completed.includes(statusKey);
                const isCurrent = current === statusKey;
                const isLast = index === steps.length - 1;

                let circleBg = '#E2E8F0';
                let circleBorder = '#CBD5E1';
                let labelColor = Colors.textSecondary;
                let lineColor = '#E2E8F0';

                if (isCancelled) {
                    circleBg = '#F1F5F9';
                    circleBorder = '#E2E8F0';
                    labelColor = '#CBD5E1';
                } else if (isCompleted) {
                    circleBg = Colors.success;
                    circleBorder = Colors.success;
                    labelColor = Colors.success;
                    lineColor = Colors.success;
                } else if (isCurrent) {
                    circleBg = Colors.primary;
                    circleBorder = Colors.primary;
                    labelColor = Colors.text;
                }

                return (
                    <View key={index} style={styles.stepContainer}>
                        <View style={styles.stepLeft}>
                            <View
                                style={[
                                    styles.circle,
                                    { backgroundColor: circleBg, borderColor: circleBorder },
                                ]}
                            >
                                {isCompleted && !isCancelled ? (
                                    <SymbolView
                                        name={{
                                            ios: 'checkmark',
                                            android: 'check',
                                            web: 'check',
                                        }}
                                        size={14}
                                        tintColor={Colors.white}
                                    />
                                ) : isCurrent && !isCancelled ? (
                                    <View style={styles.currentDot} />
                                ) : null}
                            </View>
                            {!isLast && (
                                <View style={[styles.line, { backgroundColor: lineColor }]} />
                            )}
                        </View>

                        <View style={styles.stepContent}>
                            <Text
                                style={[
                                    styles.stepLabel,
                                    { color: labelColor },
                                    isCurrent && styles.stepLabelCurrent,
                                    isCompleted && !isCancelled && styles.stepLabelCompleted,
                                ]}
                            >
                                {label}
                            </Text>
                            {isCurrent && !isCancelled && (
                                <Text style={styles.currentLabel}>Estado actual</Text>
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.lg,
    },
    cancelledBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: Spacing.md,
        borderRadius: 10,
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    cancelledText: {
        color: '#991B1B',
        fontSize: 14,
        fontWeight: '600',
    },
    stepContainer: {
        flexDirection: 'row',
        minHeight: 32,
    },
    stepLeft: {
        alignItems: 'center',
        width: 24,
        marginRight: Spacing.md,
    },
    circle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    currentDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.white,
    },
    line: {
        width: 2,
        flex: 1,
        minHeight: 12,
        marginTop: 4,
    },
    stepContent: {
        flex: 1,
        paddingBottom: Spacing.md,
    },
    stepLabel: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    stepLabelCurrent: {
        fontWeight: '700',
    },
    stepLabelCompleted: {
        fontWeight: '600',
    },
    currentLabel: {
        fontSize: 11,
        color: Colors.primary,
        fontWeight: '500',
        marginTop: 2,
    },
});
