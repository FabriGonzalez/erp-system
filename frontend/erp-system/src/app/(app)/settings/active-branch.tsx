import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { IconBadge } from '@/components/ui/IconBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useActiveBranch, useMyBranches } from '@/hooks/use-branch-queries';
import { useBranchStore } from '@/stores/branch-store';
import { SharedStyles } from '@/styles/shared';
import { Branch } from '@/types/branch';

export default function ActiveBranchScreen() {
    const activeBranch = useActiveBranch();
    const selectActiveBranch = useBranchStore((state) => state.selectActiveBranch);
    const {
        branches: availableBranches,
        isLoading,
        isRefreshing,
        error,
        refresh: handleRefresh,
    } = useMyBranches();

    async function handleSelectBranch(branch: Branch) {
        await selectActiveBranch(branch.id);
        router.back();
    }

    return (
        <Screen style={styles.container}>
            {/* Header local con botón Back */}
            <PageHeader onBack={() => router.back()} eyebrow="Más" title="Sucursal activa" />

            <Text style={styles.description}>
                Seleccioná la sucursal activa en la que vas a operar. El inventario, pedidos y ventas se filtrarán para esta sucursal.
            </Text>

            {isLoading ? (
                <LoadingState label="Cargando sucursales..." />
            ) : error ? (
                <ErrorState message={error} onRetry={handleRefresh} />
            ) : (
                <FlatList
                    data={availableBranches}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={
                        SharedStyles.pageList
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={handleRefresh}
                            colors={[Colors.primary]}
                            tintColor={Colors.primary}
                        />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            title="Sin sucursales asignadas"
                            description="No tenés sucursales asignadas a tu cuenta. Contactá a un administrador para que te asigne una sucursal."
                        />
                    }
                    renderItem={({ item }) => {
                        const isActive = activeBranch?.id === item.id;
                        return (
                            <Pressable
                                onPress={() => handleSelectBranch(item)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isActive }}
                                style={({ pressed }) => [
                                    SharedStyles.card,
                                    SharedStyles.listItem,
                                    isActive && styles.activeItem,
                                    pressed && SharedStyles.listItemPressed,
                                ]}
                            >
                                <IconBadge
                                    icon={{ ios: 'building.2', android: 'store', web: 'store' }}
                                    tone={isActive ? 'primary' : 'neutral'}
                                    size={44}
                                />
                                <View style={SharedStyles.listItemTexts}>
                                    <Text style={SharedStyles.listItemTitle}>
                                        {item.name}
                                    </Text>
                                    {item.address ? (
                                        <Text style={SharedStyles.listItemMeta}>
                                            {item.address}
                                        </Text>
                                    ) : null}
                                    {item.phone ? (
                                        <Text style={SharedStyles.listItemMeta}>
                                            Tel: {item.phone}
                                        </Text>
                                    ) : null}
                                </View>

                                {isActive && (
                                    <SymbolView
                                        name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                                        size={22}
                                        tintColor={Colors.primary}
                                    />
                                )}
                            </Pressable>
                        );
                    }}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
    description: {
        fontSize: 14,
        color: Colors.textSecondary,
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        lineHeight: 20,
    },
    activeItem: {
        borderColor: Colors.primary,
    },
});
