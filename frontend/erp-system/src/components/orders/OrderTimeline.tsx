import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
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

    const shippingFlow: Order['status'][] = SHIPPING_STATUS_FLOW;

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
        : ['A preparar', 'Enviado'];

    const statusSteps: Order['status'][] =
        order.deliveryType === 'LOCAL_PICKUP'
            ? ['CONFIRMED', 'CONFIRMED']
            : SHIPPING_STATUS_FLOW;

    return (
        <View style={SharedStyles.card}>
            <Text style={[SharedStyles.cardTitle, styles.title]}>Estado del pedido</Text>

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

                let circleBg = Colors.border;
                let circleBorder = Colors.track;
                let labelColor = Colors.textSecondary;
                let lineColor = Colors.border;

                if (isCancelled) {
                    circleBg = Colors.muted;
                    circleBorder = Colors.border;
                    labelColor = Colors.track;
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
    title: {
        marginBottom: Spacing.lg,
    },
    cancelledBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.errorLight,
        padding: Spacing.md,
        borderRadius: 10,
        gap: Spacing.sm,
        marginBottom: Spacing.lg,
    },
    cancelledText: {
        color: Colors.errorDark,
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
