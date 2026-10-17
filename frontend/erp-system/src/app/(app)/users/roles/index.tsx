import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useRoles } from '@/hooks/use-role-queries';
import { SharedStyles } from '@/styles/shared';
import { Role } from '@/types/role';

export default function RolesScreen() {
    const { roles, isLoading, isRefreshing, error, reload } = useRoles();
    // Activos primero; los de sistema arriba de todo.
    const sorted = [...roles].sort((a, b) =>
        Number(b.active) - Number(a.active)
        || Number(b.system) - Number(a.system)
        || a.name.localeCompare(b.name, 'es'));

    function renderItem({ item }: { item: Role }) {
        return (
            <Pressable
                style={({ pressed }) => [styles.card, !item.active && styles.inactiveCard, pressed && SharedStyles.pressed]}
                onPress={() => router.push({ pathname: '/users/roles/[id]', params: { id: item.id } })}
            >
                <View style={styles.cardMain}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.secondary}>
                        {item.code} · {item.permissions.length} {item.permissions.length === 1 ? 'permiso' : 'permisos'}
                    </Text>
                    {Boolean(item.description) && (
                        <Text style={styles.secondary} numberOfLines={2}>{item.description}</Text>
                    )}
                </View>
                <View style={styles.badges}>
                    {item.system && <Text style={styles.systemText}>Del sistema</Text>}
                    {!item.active && <Text style={styles.inactiveText}>Inactivo</Text>}
                </View>
            </Pressable>
        );
    }

    return (
        <Screen style={styles.screen}>
            <View style={[SharedStyles.topBar, SharedStyles.topBarElevated]}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <View style={styles.titleContainer}>
                    <Text style={styles.screenTitle}>Roles</Text>
                    <Text style={styles.screenSubtitle}>Qué puede hacer cada usuario</Text>
                </View>
                <Pressable
                    style={({ pressed }) => [styles.createButton, pressed && SharedStyles.pressed]}
                    onPress={() => router.push('/users/roles/new')}
                >
                    <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={18} tintColor={Colors.white} />
                    <Text style={styles.createButtonText}>Nuevo</Text>
                </Pressable>
            </View>

            {isLoading ? (
                <LoadingState label="Cargando roles..." />
            ) : error && roles.length === 0 ? (
                <ErrorState message={error} onRetry={reload} />
            ) : (
                <FlatList
                    data={sorted}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={sorted.length === 0 ? SharedStyles.listEmpty : styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={reload} tintColor={Colors.primary} />}
                    ListEmptyComponent={<EmptyState title="Sin roles" description="Creá el primer rol." />}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
        marginRight: Spacing.xs,
    },
    titleContainer: {
        flex: 1,
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    screenSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
        marginTop: 2,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        gap: 6,
    },
    createButtonText: {
        color: Colors.white,
        fontSize: 14,
        fontWeight: '600',
    },
    listContainer: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    inactiveCard: {
        opacity: 0.6,
    },
    cardMain: {
        flex: 1,
        gap: 2,
    },
    name: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    secondary: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    badges: {
        alignItems: 'flex-end',
        gap: 4,
    },
    systemText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    inactiveText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
});
