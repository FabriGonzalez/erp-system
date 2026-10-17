import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppInput } from '@/components/ui/AppInput';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilterChip } from '@/components/ui/FilterChip';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCompanyUsers } from '@/hooks/use-user-queries';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { CompanyUser } from '@/types/user';

type StatusFilter = 'active' | 'inactive' | 'all';

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'active', label: 'Activos' },
    { value: 'inactive', label: 'Inactivos' },
    { value: 'all', label: 'Todos' },
];

export default function UsersScreen() {
    const currentUserId = useAuthStore((state) => state.user?.id);
    const { users, isLoading, isRefreshing, error, reload } = useCompanyUsers();
    const [query, setQuery] = useState('');
    const [status, setStatus] = useState<StatusFilter>('active');

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return users
            .filter((user) => status === 'all' || user.active === (status === 'active'))
            .filter((user) => !normalized
                || user.fullName.toLowerCase().includes(normalized)
                || user.username.toLowerCase().includes(normalized)
                || user.email.toLowerCase().includes(normalized)
                || user.roleName.toLowerCase().includes(normalized))
            .sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
    }, [users, query, status]);

    function renderItem({ item }: { item: CompanyUser }) {
        const isMe = item.id === currentUserId;
        return (
            <Pressable
                style={({ pressed }) => [styles.card, !item.active && styles.inactiveCard, pressed && SharedStyles.pressed]}
                onPress={() => router.push({ pathname: '/users/[id]', params: { id: item.id } })}
            >
                <View style={styles.cardMain}>
                    <Text style={styles.name}>
                        {item.fullName}
                        {isMe ? <Text style={styles.me}>  (vos)</Text> : null}
                    </Text>
                    <Text style={styles.secondary}>@{item.username} · {item.email}</Text>
                </View>
                <View style={styles.badges}>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>{item.roleName}</Text>
                    </View>
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
                    <Text style={styles.screenTitle}>Usuarios</Text>
                    <Text style={styles.screenSubtitle}>
                        {isLoading ? 'Cargando...' : `${filtered.length} ${filtered.length === 1 ? 'usuario' : 'usuarios'}`}
                    </Text>
                </View>

                <Pressable
                    style={({ pressed }) => [styles.secondaryButton, pressed && SharedStyles.pressed]}
                    onPress={() => router.push('/users/roles')}
                >
                    <Text style={styles.secondaryButtonText}>Roles</Text>
                </Pressable>
                <Pressable
                    style={({ pressed }) => [styles.createButton, pressed && SharedStyles.pressed]}
                    onPress={() => router.push('/users/new')}
                >
                    <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={18} tintColor={Colors.white} />
                    <Text style={styles.createButtonText}>Nuevo</Text>
                </Pressable>
            </View>

            <View style={styles.searchContainer}>
                <AppInput
                    placeholder="Buscar por nombre, usuario, email o rol..."
                    value={query}
                    onChangeText={setQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                <View style={styles.filters}>
                    {STATUS_FILTERS.map((filter) => (
                        <FilterChip
                            key={filter.value}
                            label={filter.label}
                            selected={status === filter.value}
                            onPress={() => setStatus(filter.value)}
                        />
                    ))}
                </View>
            </View>

            {isLoading ? (
                <LoadingState label="Cargando usuarios..." />
            ) : error && users.length === 0 ? (
                <ErrorState message={error} onRetry={reload} />
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={filtered.length === 0 ? SharedStyles.listEmpty : styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={reload} tintColor={Colors.primary} />}
                    ListEmptyComponent={
                        <EmptyState
                            title="Sin usuarios"
                            description={query ? 'Ningún usuario coincide con la búsqueda.' : 'No hay usuarios con ese estado.'}
                        />
                    }
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
    secondaryButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: Colors.border,
        marginRight: Spacing.sm,
    },
    secondaryButtonText: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '600',
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
    searchContainer: {
        padding: Spacing.lg,
        paddingBottom: Spacing.sm,
        gap: Spacing.sm,
    },
    filters: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    listContainer: {
        padding: Spacing.lg,
        paddingTop: Spacing.sm,
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
    me: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    secondary: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    badges: {
        alignItems: 'flex-end',
        gap: 4,
    },
    roleBadge: {
        backgroundColor: Colors.primaryLight,
        borderRadius: 6,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    roleBadgeText: {
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
