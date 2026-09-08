import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

import { mockDashboardStats } from '@/data/mock-dashboard';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';

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
        minHeight: 110,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingVertical: Spacing.lg,
        paddingHorizontal: Spacing.md,
        gap: Spacing.sm,
    },

    actionButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
        textAlign: 'center',
    },
    pressed: {
        opacity: 0.7,
        backgroundColor: Colors.muted,
    },
});