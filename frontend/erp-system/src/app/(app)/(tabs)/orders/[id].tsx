import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { OrderTimeline } from '@/components/OrderTimeline';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

import { useAuthStore } from '@/stores/auth-store';
import { useOrderStore } from '@/stores/order-store';
import {
    DELIVERY_TYPE_LABELS,
    ORDER_STATUS_LABELS,
    Order,
    OrderStatus,
    SHIPPING_STATUS_FLOW,
} from '@/types/order';

function getStatusBadgeColor(status: OrderStatus) {
    switch (status) {
        case 'DRAFT':
            return {
                bg: '#F1F5F9',
                text: Colors.textSecondary,
            };

        case 'CONFIRMED':
            return {
                bg: '#EFF6FF',
                text: Colors.primary,
            };

        case 'IN_PREPARATION':
            return {
                bg: '#FEF3C7',
                text: '#D97706',
            };

        case 'READY_TO_SHIP':
            return {
                bg: '#F0FDFA',
                text: '#0D9488',
            };

        case 'SHIPPED':
            return {
                bg: '#EDE9FE',
                text: '#7C3AED',
            };

        case 'DELIVERED':
            return {
                bg: '#F0FDF4',
                text: Colors.success,
            };

        case 'CANCELLED':
            return {
                bg: '#FEF2F2',
                text: Colors.error,
            };

        default:
            return {
                bg: '#F1F5F9',
                text: Colors.textSecondary,
            };
    }
}

function formatDateTime(iso: string): string {
    const date = new Date(iso);

    return (
        date.toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }) +
        ' · ' +
        date.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
        })
    );
}

export default function OrderDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const user = useAuthStore((state) => state.user);

    const orders = useOrderStore((state) => state.orders);
    const confirmOrder = useOrderStore((state) => state.confirmOrder);
    const cancelOrder = useOrderStore((state) => state.cancelOrder);
    const advanceOrderStatus = useOrderStore(
        (state) => state.advanceOrderStatus
    );

    const [successMessage, setSuccessMessage] = useState<string | null>(
        null
    );

    const order = orders.find((order) => order.id === id);

    const canUpdate =
        user?.role === 'ADMINISTRATOR' ||
        Boolean(user?.permissions?.includes('ORDERS_UPDATE'));

    if (!order) {
        return (
            <Screen style={styles.screen}>
                <View style={styles.header}>
                    <Pressable
                        onPress={() => router.back()}
                        style={({ pressed }) => [
                            styles.backButton,
                            pressed && styles.pressed,
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

                    <Text style={styles.headerTitle}>
                        Pedido
                    </Text>

                    <View style={styles.headerSpacer} />
                </View>

                <EmptyState
                    title="Pedido no encontrado"
                    description="El pedido que buscás no existe o fue eliminado."
                    actionLabel="Volver a pedidos"
                    onAction={() => router.back()}
                />
            </Screen>
        );
    }

    const currentOrder: Order = order;

    const isDraft = currentOrder.status === 'DRAFT';
    const isCancelled = currentOrder.status === 'CANCELLED';
    const isDelivered = currentOrder.status === 'DELIVERED';
    const isShipping =
        currentOrder.deliveryType === 'SHIPPING';

    const statusBadge = getStatusBadgeColor(
        currentOrder.status
    );

    const currentStatusIndex = SHIPPING_STATUS_FLOW.indexOf(
        currentOrder.status
    );

    const canAdvance =
        isShipping &&
        !isDraft &&
        !isCancelled &&
        !isDelivered &&
        currentStatusIndex >= 0 &&
        currentStatusIndex <
        SHIPPING_STATUS_FLOW.length - 1;

    function showSuccessMessage(message: string) {
        setSuccessMessage(message);

        setTimeout(() => {
            setSuccessMessage(null);
        }, 2000);
    }

    function handleEdit() {
        router.push({
            pathname: '/(app)/(tabs)/orders/new',
            params: {
                orderId: currentOrder.id,
            },
        });
    }

    function handleConfirm() {
        const success = confirmOrder(currentOrder.id);

        if (!success) {
            return;
        }

        showSuccessMessage(
            'Pedido confirmado correctamente'
        );
    }

    function handleCancel() {
        const success = cancelOrder(currentOrder.id);

        if (!success) {
            return;
        }

        showSuccessMessage('Pedido cancelado');
    }

    function handleAdvance() {
        const success = advanceOrderStatus(
            currentOrder.id
        );

        if (!success) {
            return;
        }

        showSuccessMessage(
            'Estado del pedido actualizado'
        );
    }

    return (
        <Screen style={styles.screen}>
            {/* Header */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [
                        styles.backButton,
                        pressed && styles.pressed,
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

                <Text style={styles.headerTitle}>
                    {currentOrder.orderNumber}
                </Text>

                <View
                    style={[
                        styles.statusBadge,
                        {
                            backgroundColor:
                                statusBadge.bg,
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
                        {
                            ORDER_STATUS_LABELS[
                            currentOrder.status
                            ]
                        }
                    </Text>
                </View>
            </View>

            {/* Success Banner */}
            {successMessage && (
                <View style={styles.successBanner}>
                    <SymbolView
                        name={{
                            ios: 'checkmark.circle.fill',
                            android: 'check_circle',
                            web: 'check_circle',
                        }}
                        size={20}
                        tintColor={Colors.success}
                    />

                    <Text style={styles.successText}>
                        {successMessage}
                    </Text>
                </View>
            )}

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={
                    styles.scrollContent
                }
            >
                {/* Info Card */}
                <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>
                            Cliente
                        </Text>

                        <Text style={styles.infoValue}>
                            {currentOrder.customerName}
                        </Text>
                    </View>

                    <View style={styles.infoDivider} />

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>
                            Entrega
                        </Text>

                        <Text style={styles.infoValue}>
                            {
                                DELIVERY_TYPE_LABELS[
                                currentOrder.deliveryType
                                ]
                            }
                        </Text>
                    </View>

                    {isShipping &&
                        currentOrder.address && (
                            <>
                                <View
                                    style={
                                        styles.infoDivider
                                    }
                                />

                                <View
                                    style={
                                        styles.infoRow
                                    }
                                >
                                    <Text
                                        style={
                                            styles.infoLabel
                                        }
                                    >
                                        Dirección
                                    </Text>

                                    <Text
                                        style={
                                            styles.infoValue
                                        }
                                    >
                                        {
                                            currentOrder
                                                .address
                                                .street
                                        }{' '}
                                        {
                                            currentOrder
                                                .address
                                                .number
                                        }
                                        {'\n'}
                                        {
                                            currentOrder
                                                .address
                                                .city
                                        }
                                        ,{' '}
                                        {
                                            currentOrder
                                                .address
                                                .province
                                        }
                                    </Text>
                                </View>
                            </>
                        )}

                    <View style={styles.infoDivider} />

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>
                            Sucursal
                        </Text>

                        <Text style={styles.infoValue}>
                            {currentOrder.branchName}
                        </Text>
                    </View>

                    <View style={styles.infoDivider} />

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>
                            Fecha
                        </Text>

                        <Text style={styles.infoValue}>
                            {formatDateTime(
                                currentOrder.createdAt
                            )}
                        </Text>
                    </View>
                </View>

                {/* Products */}
                <View style={styles.productsCard}>
                    <Text style={styles.sectionTitle}>
                        Productos
                    </Text>

                    {currentOrder.items.map((item) => (
                        <View
                            key={item.id}
                            style={styles.productRow}
                        >
                            <View
                                style={
                                    styles.productInfo
                                }
                            >
                                <Text
                                    style={
                                        styles.productName
                                    }
                                    numberOfLines={1}
                                >
                                    {item.productName}
                                </Text>

                                <Text
                                    style={
                                        styles.productDetail
                                    }
                                >
                                    {item.quantity} × $
                                    {item.unitPrice.toLocaleString(
                                        'es-AR'
                                    )}
                                </Text>
                            </View>

                            <Text
                                style={
                                    styles.productSubtotal
                                }
                            >
                                $
                                {item.subtotal.toLocaleString(
                                    'es-AR'
                                )}
                            </Text>
                        </View>
                    ))}

                    <View style={styles.totalRow}>
                        <Text style={styles.totalLabel}>
                            Total
                        </Text>

                        <Text style={styles.totalValue}>
                            $
                            {currentOrder.total.toLocaleString(
                                'es-AR'
                            )}
                        </Text>
                    </View>
                </View>

                {/* Timeline */}
                <OrderTimeline
                    order={currentOrder}
                />
            </ScrollView>

            {/* Actions */}
            {canUpdate &&
                !isCancelled &&
                !isDelivered && (
                    <View
                        style={
                            styles.actionsContainer
                        }
                    >
                        {isDraft && (
                            <>
                                <Pressable
                                    style={
                                        styles.editButton
                                    }
                                    onPress={
                                        handleEdit
                                    }
                                >
                                    <Text
                                        style={
                                            styles.editButtonText
                                        }
                                    >
                                        Editar
                                    </Text>
                                </Pressable>

                                <Pressable
                                    style={
                                        styles.confirmButton
                                    }
                                    onPress={
                                        handleConfirm
                                    }
                                >
                                    <Text
                                        style={
                                            styles.confirmButtonText
                                        }
                                    >
                                        Confirmar
                                    </Text>
                                </Pressable>
                            </>
                        )}

                        {canAdvance && (
                            <Pressable
                                style={
                                    styles.advanceButton
                                }
                                onPress={
                                    handleAdvance
                                }
                            >
                                <Text
                                    style={
                                        styles.advanceButtonText
                                    }
                                >
                                    Avanzar estado
                                </Text>
                            </Pressable>
                        )}

                        <Pressable
                            style={
                                styles.cancelButton
                            }
                            onPress={handleCancel}
                        >
                            <Text
                                style={
                                    styles.cancelButtonText
                                }
                            >
                                Cancelar pedido
                            </Text>
                        </Pressable>
                    </View>
                )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
        backgroundColor: Colors.background,
    },

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

    pressed: {
        opacity: 0.7,
    },

    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },

    headerSpacer: {
        width: 32,
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

    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#BBF7D0',
    },

    successText: {
        color: '#166534',
        fontSize: 14,
        fontWeight: '600',
    },

    scrollContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
        gap: Spacing.md,
    },

    infoCard: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    infoRow: {
        paddingVertical: Spacing.sm,
    },

    infoLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 2,
    },

    infoValue: {
        fontSize: 15,
        fontWeight: '500',
        color: Colors.text,
    },

    infoDivider: {
        height: 1,
        backgroundColor: '#F1F5F9',
    },

    productsCard: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.md,
    },

    productRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },

    productInfo: {
        flex: 1,
        marginRight: Spacing.md,
    },

    productName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },

    productDetail: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },

    productSubtotal: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.text,
    },

    totalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Spacing.md,
        marginTop: Spacing.xs,
    },

    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },

    totalValue: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.primary,
    },

    actionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },

    editButton: {
        flex: 1,
        minWidth: 100,
        height: 44,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
    },

    editButtonText: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '600',
    },

    confirmButton: {
        flex: 1,
        minWidth: 100,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
    },

    confirmButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },

    advanceButton: {
        flex: 1,
        minWidth: 100,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
    },

    advanceButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },

    cancelButton: {
        width: '100%',
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },

    cancelButtonText: {
        color: Colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
});