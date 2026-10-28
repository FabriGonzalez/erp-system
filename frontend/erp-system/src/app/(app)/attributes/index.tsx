import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
    FlatList,
    ActivityIndicator,
    Pressable,
    RefreshControl,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';

import { ProductAttributeFormModal } from '@/components/attributes/ProductAttributeFormModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { IconBadge } from '@/components/ui/IconBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { useAttributes, useSetAttributeActive } from '@/hooks/use-attribute-queries';
import { showErrorToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
import { ProductAttribute } from '@/types/product';

export default function AttributesListScreen() {
    const { attributes, attributeValues, isLoading, isRefreshing, error, refresh } = useAttributes();
    const setAttributeActive = useSetAttributeActive();

    const [isFormModalVisible, setIsFormModalVisible] = useState(false);
    const [editingAttribute, setEditingAttribute] = useState<ProductAttribute | null>(null);

    async function handleToggle(attribute: ProductAttribute) {
        try {
            await setAttributeActive.mutateAsync({ id: attribute.id, active: !attribute.active });
        } catch (toggleError) {
            showErrorToast(toggleError, 'No se pudo cambiar el estado del atributo.');
        }
    }

    function handleOpenCreate() {
        setEditingAttribute(null);
        setIsFormModalVisible(true);
    }

    function handleOpenEdit(attribute: ProductAttribute) {
        setEditingAttribute(attribute);
        setIsFormModalVisible(true);
    }

    function getValuesCount(attributeId: string): number {
        let count = 0;
        for (let i = 0; i < attributeValues.length; i++) {
            if (attributeValues[i].attributeId === attributeId) {
                count++;
            }
        }
        return count;
    }

    function renderItem({ item }: { item: ProductAttribute }) {
        const valuesCount = getValuesCount(item.id);

        return (
            <Pressable
                style={({ pressed }) => [
                    SharedStyles.card,
                    SharedStyles.listItem,
                    !item.active && SharedStyles.listItemInactive,
                    pressed && SharedStyles.listItemPressed,
                ]}
                onPress={() => router.push({
                    pathname: "/attributes/[id]",
                    params: { id: item.id },
                })}
                accessibilityRole="button"
            >
                <IconBadge
                    icon={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }}
                    tone="warning"
                    size={44}
                />
                <View style={SharedStyles.listItemTexts}>
                    <Text style={SharedStyles.listItemTitle} numberOfLines={1}>{item.name}</Text>
                    <Text style={SharedStyles.listItemMeta}>
                        {valuesCount === 1 ? '1 valor' : `${valuesCount} valores`}
                    </Text>
                    {!item.active ? <StatusPill label="Inactivo" tone="neutral" /> : null}
                </View>

                <View style={styles.actionsRow}>
                    <Switch
                        value={item.active}
                        onValueChange={() => void handleToggle(item)}
                        trackColor={{ false: Colors.track, true: Colors.primary }}
                        thumbColor={Colors.white}
                        accessibilityLabel={item.active ? 'Desactivar atributo' : 'Activar atributo'}
                    />
                    <Pressable
                        style={({ pressed }) => [styles.iconButton, pressed && SharedStyles.pressed]}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(item);
                        }}
                        accessibilityRole="button"
                        accessibilityLabel="Renombrar atributo"
                    >
                        <SymbolView
                            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                            size={18}
                            tintColor={Colors.primary}
                        />
                    </Pressable>
                </View>
            </Pressable>
        );
    }

    return (
        <Screen style={styles.container}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow="Talle, color... para las variantes"
                title="Atributos"
                right={<HeaderButton label="Nuevo" accessibilityLabel="Nuevo atributo" onPress={handleOpenCreate} />}
            />

            {/* El "sin atributos" se muestra recién cuando se sabe que no hay (antes salía bajo el spinner). */}
            {isLoading ? (
                <ActivityIndicator color={Colors.primary} style={styles.loader} />
            ) : error ? (
                <EmptyState
                    title="No se pudieron cargar los atributos"
                    description={error}
                    actionLabel="Reintentar"
                    onAction={refresh}
                />
            ) : (
                <FlatList
                    data={attributes}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={SharedStyles.pageList}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.primary} />
                    }
                    ListEmptyComponent={
                        <EmptyState
                            title="Sin atributos registrados"
                            description="Creá tu primer atributo como Color o Talle para comenzar a definir variantes."
                            actionLabel="+ Crear Atributo"
                            onAction={handleOpenCreate}
                        />
                    }
                />
            )}

            {/* Modal de Creación / Edición */}
            <ProductAttributeFormModal
                visible={isFormModalVisible}
                attributeId={editingAttribute?.id}
                initialName={editingAttribute?.name ?? ''}
                onClose={() => {
                    setIsFormModalVisible(false);
                    setEditingAttribute(null);
                }}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
    },
    loader: {
        marginVertical: Spacing.xl,
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    iconButton: {
        padding: 8,
        borderRadius: Radius.sm,
        backgroundColor: Colors.primaryLight,
    },
});
