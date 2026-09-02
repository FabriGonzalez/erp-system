import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';

import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { mockDashboardStats, mockRecentOrders } from '@/data/mock-dashboard';

export default function HomeScreen() {
    const user = useAuthStore((state) => state.user);
    const activeBranch = useBranchStore((state) => state.activeBranch);

    function handleNewOrder() {
        // Redirigir a la pestaña de Pedidos
        router.push('/(app)/(tabs)/orders');
    }

    function handleViewInventory() {
        // Redirigir a productos o inventario
        router.push('/(app)/(tabs)/products');
    }

    // Helper para formatear estado de pedido
    function getStatusBadgeStyle(status: string) {
        switch (status) {
            case 'CONFIRMED':
                return { bg: '#E0F2FE', text: '#0369A1', label: 'Confirmado' };
            case 'IN_PREPARATION':
                return { bg: '#FEF3C7', text: '#D97706', label: 'En Prep.' };
            case 'DRAFT':
                return { bg: '#F1F5F9', text: '#475569', label: 'Borrador' };
            default:
                return { bg: '#E2E8F0', text: '#64748B', label: status };
        }
    }

    return (
        <Screen style={styles.screen}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                {/* Cabecera / Bienvenida */}
                <View style={styles.welcomeCard}>
                    <View>
                        <Text style={styles.greeting}>Hola, {user?.name ?? 'Usuario'}</Text>
                        <Text style={styles.roleText}>
                            {user?.role === 'ADMINISTRATOR' ? 'Administrador' : 'Empleado'}
                        </Text>
                    </View>
                    <SymbolView
                        name={{ ios: 'person.crop.circle.fill', android: 'account_circle', web: 'account_circle' }}
                        size={40}
                        tintColor={Colors.primary}
                    />
                </View>

                {/* Grid de Estadísticas */}
                <View style={styles.statsGrid}>
                    {mockDashboardStats.map((stat, index) => (
                        <View key={index} style={styles.statCard}>
                            <View style={styles.statHeader}>
                                <Text style={styles.statIcon}>{stat.icon}</Text>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                        </View>
                    ))}
                </View>

                {/* Acciones Rápidas */}
                <SectionHeader title="Acciones Rápidas" />
                <View style={styles.actionsContainer}>
                    <Pressable
                        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                        onPress={handleNewOrder}
                    >
                        <SymbolView
                            name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }}
                            size={24}
                            tintColor={Colors.primary}
                        />
                        <Text style={styles.actionButtonText}>Nuevo Pedido</Text>
                    </Pressable>

                    <Pressable
                        style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
                        onPress={handleViewInventory}
                    >
                        <SymbolView
                            name={{ ios: 'square.grid.3x3.fill', android: 'apps', web: 'apps' }}
                            size={24}
                            tintColor={Colors.primary}
                        />
                        <Text style={styles.actionButtonText}>Inventario</Text>
                    </Pressable>
                </View>

                {/* Pedidos Recientes */}
                <SectionHeader
                    title="Pedidos Recientes"
                    actionLabel="Ver todos"
                    onAction={() => router.push('/(app)/(tabs)/orders')}
                />
                
                {mockRecentOrders.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No hay pedidos recientes</Text>
                    </View>
                ) : (
                    <View style={styles.ordersList}>
                        {mockRecentOrders.map((order) => {
                            const badge = getStatusBadgeStyle(order.status);
                            return (
                                <Pressable
                                    key={order.id}
                                    style={({ pressed }) => [styles.orderCard, pressed && styles.pressed]}
                                    onPress={() => router.push(`/(app)/(tabs)/orders`)}
                                >
                                    <View style={styles.orderInfo}>
                                        <Text style={styles.orderNumber}>{order.orderNumber}</Text>
                                        <Text style={styles.customerName}>{order.customerName}</Text>
                                        <Text style={styles.orderDate}>{order.date}</Text>
                                    </View>
                                    <View style={styles.orderMeta}>
                                        <Text style={styles.orderTotal}>
                                            ${order.total.toLocaleString('es-AR')}
                                        </Text>
                                        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                                            <Text style={[styles.badgeText, { color: badge.text }]}>
                                                {badge.label}
                                            </Text>
                                        </View>
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                )}
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    scrollContainer: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl,
    },
    welcomeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        borderRadius: 16,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.lg,
    },
    greeting: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    roleText: {
        fontSize: 14,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: Spacing.md,
    },
    statCard: {
        width: '48%',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.md,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: Spacing.sm,
    },
    statIcon: {
        fontSize: 18,
        marginRight: Spacing.xs,
    },
    statLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Spacing.md,
        marginBottom: Spacing.md,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        paddingVertical: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.sm,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    ordersList: {
        gap: Spacing.md,
    },
    orderCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    orderInfo: {
        justifyContent: 'space-between',
        gap: Spacing.xs,
    },
    orderNumber: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    customerName: {
        fontSize: 14,
        color: Colors.text,
    },
    orderDate: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    orderMeta: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    orderTotal: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    badge: {
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    emptyContainer: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.border,
    },
    emptyText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },
    pressed: {
        opacity: 0.7,
        backgroundColor: '#F1F5F9',
    },
});