import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { AppInput } from '@/components/ui/AppInput';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { FilterChip } from '@/components/ui/FilterChip';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
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
                style={({ pressed }) => [
                    SharedStyles.card,
                    SharedStyles.listItem,
                    !item.active && SharedStyles.listItemInactive,
                    pressed && SharedStyles.listItemPressed,
                ]}
                onPress={() => router.push({ pathname: '/users/[id]', params: { id: item.id } })}
                accessibilityRole="button"
            >
                <Avatar
                    name={item.fullName}
                    size={44}
                    fontWeight="700"
                    fontSize={16}
                    backgroundColor={Colors.violetLight}
                    textColor={Colors.violet}
                />
                <View style={SharedStyles.listItemTexts}>
                    <Text style={SharedStyles.listItemTitle} numberOfLines={1}>
                        {item.fullName}
                        {isMe ? <Text style={styles.me}>  (vos)</Text> : null}
                    </Text>
                    <Text style={SharedStyles.listItemMeta} numberOfLines={1}>@{item.username} · {item.email}</Text>
                </View>
                <View style={styles.badges}>
                    <StatusPill label={item.roleName} tone="primary" />
                    {!item.active ? <StatusPill label="Inactivo" tone="neutral" /> : null}
                </View>
            </Pressable>
        );
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow={isLoading ? 'Cargando...' : `${filtered.length} ${filtered.length === 1 ? 'usuario' : 'usuarios'}`}
                title="Usuarios"
                right={(
                    <View style={styles.headerActions}>
                        <HeaderButton label="Roles" icon={null} variant="secondary" onPress={() => router.push('/users/roles')} />
                        <HeaderButton label="Nuevo" accessibilityLabel="Nuevo usuario" onPress={() => router.push('/users/new')} />
                    </View>
                )}
            />

            <View style={SharedStyles.pageToolbar}>
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
                    contentContainerStyle={SharedStyles.pageList}
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
    headerActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    filters: {
        flexDirection: 'row',
        gap: Spacing.xs,
    },
    me: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textSecondary,
    },
    badges: {
        alignItems: 'flex-end',
        gap: Spacing.xs,
    },
});
