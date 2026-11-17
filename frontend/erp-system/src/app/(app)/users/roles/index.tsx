import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { IconBadge } from '@/components/ui/IconBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
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
                style={({ pressed }) => [
                    SharedStyles.card,
                    SharedStyles.listItem,
                    !item.active && SharedStyles.listItemInactive,
                    pressed && SharedStyles.listItemPressed,
                ]}
                onPress={() => router.push({ pathname: '/users/roles/[id]', params: { id: item.id } })}
                accessibilityRole="button"
            >
                <IconBadge
                    icon={{ ios: 'person.badge.key', android: 'admin_panel_settings', web: 'admin_panel_settings' }}
                    tone="violet"
                    size={44}
                />
                <View style={SharedStyles.listItemTexts}>
                    <Text style={SharedStyles.listItemTitle}>{item.name}</Text>
                    <Text style={SharedStyles.listItemMeta}>
                        {item.code} · {item.permissions.length} {item.permissions.length === 1 ? 'permiso' : 'permisos'}
                    </Text>
                    {Boolean(item.description) && (
                        <Text style={SharedStyles.listItemMeta} numberOfLines={2}>{item.description}</Text>
                    )}
                </View>
                <View style={styles.badges}>
                    {item.system ? <StatusPill label="Del sistema" tone="primary" /> : null}
                    {!item.active ? <StatusPill label="Inactivo" tone="neutral" /> : null}
                </View>
            </Pressable>
        );
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow="Qué puede hacer cada usuario"
                title="Roles"
                right={<HeaderButton label="Nuevo" accessibilityLabel="Nuevo rol" onPress={() => router.push('/users/roles/new')} />}
            />

            {isLoading ? (
                <LoadingState label="Cargando roles..." />
            ) : error && roles.length === 0 ? (
                <ErrorState message={error} onRetry={reload} />
            ) : (
                <FlatList
                    data={sorted}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={SharedStyles.pageList}
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
    badges: {
        alignItems: 'flex-end',
        gap: Spacing.xs,
    },
});
