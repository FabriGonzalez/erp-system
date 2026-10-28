import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';

import { CategoryFormModal } from '@/components/categories/CategoryFormModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { IconBadge } from '@/components/ui/IconBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { useCategories, useSetCategoryActive } from '@/hooks/use-category-queries';
import { showErrorToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
import { Category } from '@/types/category';

export default function CategoriesScreen() {
    const { categories, isLoading, isRefreshing, error, refresh } = useCategories();
    const setCategoryActive = useSetCategoryActive();
    const [isFormModalVisible, setIsFormModalVisible] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [togglingCategoryId, setTogglingCategoryId] = useState<string | null>(null);

    function handleOpenCreate() {
        setEditingCategory(null);
        setIsFormModalVisible(true);
    }

    function handleOpenEdit(category: Category) {
        setEditingCategory(category);
        setIsFormModalVisible(true);
    }

    async function handleToggleActive(category: Category) {
        if (togglingCategoryId) return;

        setTogglingCategoryId(category.id);
        try {
            await setCategoryActive.mutateAsync({ id: category.id, active: !category.active });
        } catch (toggleError: unknown) {
            showErrorToast(toggleError, 'No se pudo cambiar el estado de la categoría.');
        } finally {
            setTogglingCategoryId(null);
        }
    }

    function renderItem({ item }: { item: Category }) {
        const isToggling = togglingCategoryId === item.id;

        return (
            <Pressable
                style={({ pressed }) => [
                    SharedStyles.card,
                    SharedStyles.listItem,
                    !item.active && SharedStyles.listItemInactive,
                    pressed && SharedStyles.listItemPressed,
                ]}
                onPress={() => handleOpenEdit(item)}
                disabled={isToggling}
                accessibilityRole="button"
                accessibilityHint="Editar la categoría"
            >
                <IconBadge
                    icon={{ ios: 'folder', android: 'folder', web: 'folder' }}
                    tone="warning"
                    size={44}
                />
                <View style={SharedStyles.listItemTexts}>
                    <Text style={SharedStyles.listItemTitle} numberOfLines={1}>{item.name}</Text>
                    {item.description ? (
                        <Text style={SharedStyles.listItemMeta} numberOfLines={2}>{item.description}</Text>
                    ) : (
                        <Text style={[SharedStyles.listItemMeta, styles.noDescription]}>Sin descripción</Text>
                    )}
                    {!item.active ? <StatusPill label="Inactiva" tone="neutral" /> : null}
                </View>
                {isToggling ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                    <Switch
                        value={item.active}
                        onValueChange={() => void handleToggleActive(item)}
                        disabled={Boolean(togglingCategoryId)}
                        trackColor={{ false: Colors.track, true: Colors.primary }}
                        thumbColor={Colors.white}
                        accessibilityLabel={item.active ? 'Desactivar categoría' : 'Activar categoría'}
                    />
                )}
            </Pressable>
        );
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow="Para organizar el catálogo"
                title="Categorías"
                right={<HeaderButton label="Nueva" accessibilityLabel="Nueva categoría" onPress={handleOpenCreate} />}
            />

            {isLoading ? (
                <LoadingState label="Cargando categorías..." />
            ) : error ? (
                <ErrorState message={error} onRetry={refresh} />
            ) : (
                <FlatList
                    data={categories}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={SharedStyles.pageList}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={refresh}
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
    noDescription: {
        fontStyle: 'italic',
    },
});
