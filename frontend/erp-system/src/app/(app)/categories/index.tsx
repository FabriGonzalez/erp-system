import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { CategoryFormModal } from '@/components/categories/CategoryFormModal';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useCategoryStore } from '@/stores/category-store';
import { SharedStyles } from '@/styles/shared';
import { Category } from '@/types/category';

export default function CategoriesScreen() {
    const token = useAuthStore((state) => state.token);
    const {
        categories,
        isLoading,
        error,
        fetchCategories,
        activateCategory,
        deactivateCategory,
    } = useCategoryStore();
    const [isFormModalVisible, setIsFormModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [togglingCategoryId, setTogglingCategoryId] = useState<string | null>(null);

    useEffect(() => {
        if (token) {
            fetchCategories(token).catch(() => {});
        }
    }, [token, fetchCategories]);

    function handleRefresh() {
        if (token) {
            fetchCategories(token).catch(() => {});
        }
    }

    function handleOpenCreate() {
        setEditingCategory(null);
        setIsFormModalVisible(true);
    }

    function handleOpenEdit(category: Category) {
        setEditingCategory(category);
        setIsFormModalVisible(true);
    }

    async function handleToggleActive(category: Category) {
        if (!token || togglingCategoryId) return;

        setTogglingCategoryId(category.id);
        try {
            if (category.active) {
                await deactivateCategory(category.id, token);
            } else {
                await activateCategory(category.id, token);
            }
        } catch (error: unknown) {
            Alert.alert(
                'Error',
                error instanceof Error
                    ? error.message
                    : 'No se pudo cambiar el estado de la categoría.'
            );
        } finally {
            setTogglingCategoryId(null);
        }
    }

    function renderItem({ item }: { item: Category }) {
        const isToggling = togglingCategoryId === item.id;

        return (
            <View style={[styles.card, !item.active && styles.inactiveCard]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.categoryName, !item.active && styles.inactiveText]}>
                        {item.name}
                    </Text>
                    <View
                        style={[
                            styles.statusBadge,
                            item.active ? styles.activeBadge : styles.inactiveBadge,
                        ]}
                    >
                        <View
                            style={[
                                styles.statusDot,
                                { backgroundColor: item.active ? Colors.success : Colors.textSecondary },
                            ]}
                        />
                        <Text
                            style={[
                                styles.statusText,
                                { color: item.active ? Colors.success : Colors.textSecondary },
                            ]}
                        >
                            {item.active ? 'Activa' : 'Inactiva'}
                        </Text>
                    </View>
                </View>

                {item.description ? (
                    <Text style={styles.description}>{item.description}</Text>
                ) : (
                    <Text style={styles.noDescription}>Sin descripción</Text>
                )}

                <View style={styles.actions}>
                    <Pressable
                        onPress={() => handleOpenEdit(item)}
                        disabled={isToggling}
                        style={({ pressed }) => [
                            styles.actionButton,
                            pressed && SharedStyles.pressed,
                        ]}
                    >
                        <SymbolView
                            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                            size={16}
                            tintColor={Colors.primary}
                        />
                        <Text style={styles.editText}>Editar</Text>
                    </Pressable>

                    <Pressable
                        onPress={() => handleToggleActive(item)}
                        disabled={Boolean(togglingCategoryId)}
                        style={({ pressed }) => [
                            styles.actionButton,
                            pressed && SharedStyles.pressed,
                        ]}
                    >
                        {isToggling ? (
                            <ActivityIndicator size="small" color={Colors.primary} />
                        ) : (
                            <SymbolView
                                name={{
                                    ios: item.active ? 'pause.circle' : 'play.circle',
                                    android: item.active ? 'pause_circle' : 'play_circle',
                                    web: item.active ? 'pause_circle' : 'play_circle',
                                }}
                                size={16}
                                tintColor={item.active ? Colors.error : Colors.success}
                            />
                        )}
                        <Text style={[styles.toggleText, { color: item.active ? Colors.error : Colors.success }]}>
                            {isToggling ? 'Guardando...' : item.active ? 'Desactivar' : 'Activar'}
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <Screen style={styles.screen}>
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={SharedStyles.headerTitle}>Categorías</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

            <View style={styles.topBanner}>
                <View style={styles.topBannerTextContainer}>
                    <Text style={styles.topBannerTitle}>Gestión de categorías</Text>
                    <Text style={styles.topBannerSubtitle}>
                        Organizá los productos del catálogo.
                    </Text>
                </View>
                <AppButton title="+ Nueva" onPress={handleOpenCreate} style={styles.addButton} />
            </View>

            {error && categories.length > 0 ? (
                <View style={styles.inlineError}>
                    <Text style={styles.inlineErrorText}>{error}</Text>
                </View>
            ) : null}

            {isLoading && categories.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={Colors.primary} />
                    <Text style={styles.loadingText}>Cargando categorías...</Text>
                </View>
            ) : error && categories.length === 0 ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <AppButton title="Reintentar" onPress={handleRefresh} style={styles.retryButton} />
                </View>
            ) : (
                <FlatList
                    data={categories}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={categories.length === 0 ? SharedStyles.listEmpty : styles.listContainer}
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
                            title="Sin categorías registradas"
                            description="Creá la primera categoría para comenzar a organizar tu catálogo."
                            actionLabel="+ Crear categoría"
                            onAction={handleOpenCreate}
                        />
                    }
                />
            )}

            <CategoryFormModal
                visible={isFormModalVisible}
                categoryToEdit={editingCategory}
                onClose={() => {
                    setIsFormModalVisible(false);
                    setEditingCategory(null);
                }}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    topBanner: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.md,
    },
    topBannerTextContainer: {
        flex: 1,
    },
    topBannerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    topBannerSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    addButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    inlineError: {
        backgroundColor: Colors.errorLight,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
    },
    inlineErrorText: {
        color: Colors.error,
        fontSize: 13,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginTop: Spacing.sm,
        fontSize: 14,
        color: Colors.textSecondary,
    },
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
    },
    errorText: {
        color: Colors.error,
        textAlign: 'center',
        marginBottom: Spacing.md,
    },
    retryButton: {
        paddingHorizontal: Spacing.lg,
    },
    listContainer: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    inactiveCard: {
        opacity: 0.8,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
    },
    categoryName: {
        flex: 1,
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    inactiveText: {
        color: Colors.textSecondary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        borderRadius: 999,
    },
    activeBadge: {
        backgroundColor: Colors.successLight,
    },
    inactiveBadge: {
        backgroundColor: Colors.muted,
    },
    statusDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    description: {
        color: Colors.textSecondary,
        fontSize: 14,
        marginTop: Spacing.sm,
    },
    noDescription: {
        color: Colors.textSecondary,
        fontSize: 14,
        fontStyle: 'italic',
        marginTop: Spacing.sm,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
        marginTop: Spacing.lg,
        paddingTop: Spacing.md,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.xs,
    },
    editText: {
        color: Colors.primary,
        fontSize: 13,
        fontWeight: '600',
    },
    toggleText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
