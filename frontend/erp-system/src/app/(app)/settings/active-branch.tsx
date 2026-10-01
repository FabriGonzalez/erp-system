import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { SharedStyles } from '@/styles/shared';
import { Branch } from '@/types/branch';

export default function ActiveBranchScreen() {
    const { user, token } = useAuthStore();
    const {
        activeBranch,
        availableBranches,
        isLoading,
        hasFetchedUserBranches,
        error,
        fetchUserBranches,
        setActiveBranch,
    } = useBranchStore();

    useEffect(() => {
        if (user && token && !hasFetchedUserBranches) {
            fetchUserBranches(user.id, token).catch(() => {});
        }
    }, [user, token, hasFetchedUserBranches, fetchUserBranches]);

    async function handleSelectBranch(branch: Branch) {
        await setActiveBranch(branch);
        router.back();
    }

    function handleRefresh() {
        if (user && token) {
            fetchUserBranches(user.id, token).catch(() => {});
        }
    }

    return (
        <Screen style={styles.container}>
            {/* Header local con botón Back */}
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [SharedStyles.backButton, pressed && styles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={SharedStyles.headerTitle}>Seleccionar Sucursal</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

            <Text style={styles.description}>
                Seleccioná la sucursal activa en la que vas a operar. El inventario, pedidos y ventas se filtrarán para esta sucursal.
            </Text>

            {isLoading && availableBranches.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Cargando sucursales...</Text>
                </View>
            ) : error && availableBranches.length === 0 ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <AppButton
                        title="Reintentar"
                        onPress={handleRefresh}
                        style={styles.retryButton}
                    />
                </View>
            ) : (
                <FlatList
                    data={availableBranches}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={
                        availableBranches.length === 0 ? SharedStyles.listEmpty : styles.listContainer
                    }
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
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
                                style={({ pressed }) => [
                                    styles.branchItem,
                                    isActive && styles.activeItem,
                                    pressed && styles.pressed,
                                ]}
                            >
                                <View style={styles.branchInfo}>
                                    <SymbolView
                                        name={{ ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' }}
                                        size={24}
                                        tintColor={isActive ? Colors.primary : Colors.textSecondary}
                                        style={styles.locationIcon}
                                    />
                                    <View style={styles.branchTextContainer}>
                                        <Text style={[styles.branchName, isActive && styles.activeBranchName]}>
                                            {item.name}
                                        </Text>
                                        {item.address ? (
                                            <Text style={styles.branchDetail}>
                                                {item.address}
                                            </Text>
                                        ) : null}
                                        {item.phone ? (
                                            <Text style={styles.branchDetail}>
                                                Tel: {item.phone}
                                            </Text>
                                        ) : null}
                                    </View>
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
        paddingVertical: Spacing.md,
        lineHeight: 20,
    },
    listContainer: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
        paddingBottom: Spacing.xl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.xl,
    },
    loadingText: {
        marginTop: Spacing.sm,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    errorContainer: {
        padding: Spacing.xl,
        alignItems: 'center',
    },
    errorText: {
        fontSize: 14,
        color: Colors.error,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    retryButton: {
        minWidth: 140,
    },
    branchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    activeItem: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight,
    },
    branchInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    branchTextContainer: {
        flex: 1,
    },
    locationIcon: {
        marginRight: Spacing.md,
    },
    branchName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    activeBranchName: {
        fontWeight: '700',
        color: Colors.primary,
    },
    branchDetail: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    pressed: {
        opacity: 0.8,
    },
});

