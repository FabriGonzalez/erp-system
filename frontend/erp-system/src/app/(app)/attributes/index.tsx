import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';

import { ProductAttributeFormModal } from '@/components/attributes/ProductAttributeFormModal';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useProductAttributeStore } from '@/stores/product-attribute-store';
import { SharedStyles } from '@/styles/shared';
import { ProductAttribute } from '@/types/product';

export default function AttributesListScreen() {
    const {
        attributes,
        attributeValues,
        toggleAttributeActive,
    } = useProductAttributeStore();

    const [isFormModalVisible, setIsFormModalVisible] = useState(false);
    const [editingAttribute, setEditingAttribute] = useState<ProductAttribute | null>(null);

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
                    styles.card,
                    !item.active && styles.inactiveCard,
                    pressed && SharedStyles.pressed,
                ]}
                onPress={() => router.push({
                    pathname: "/attributes/[id]",
                    params: { id: item.id },
                })}


            >
                <View style={styles.cardMain}>
                    <View style={styles.cardHeader}>
                        <Text style={[styles.attributeName, !item.active && styles.inactiveText]}>
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
                                {item.active ? 'Activo' : 'Inactivo'}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.valuesCountText}>
                        {valuesCount === 1 ? '1 valor' : `${valuesCount} valores`}
                    </Text>
                </View>

                <View style={styles.actionsRow}>
                    <View style={styles.switchContainer}>
                        <Switch
                            value={item.active}
                            onValueChange={() => toggleAttributeActive(item.id)}
                            trackColor={{ false: Colors.track, true: Colors.primary }}
                            thumbColor={Colors.white}
                        />
                    </View>

                    <Pressable
                        style={({ pressed }) => [styles.iconButton, pressed && SharedStyles.pressed]}
                        onPress={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(item);
                        }}
                    >
                        <SymbolView
                            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                            size={18}
                            tintColor={Colors.primary}
                        />
                    </Pressable>

                    <SymbolView
                        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                        size={20}
                        tintColor={Colors.textSecondary}
                    />
                </View>
            </Pressable >
        );
    }

    return (
        <Screen style={styles.container}>
            {/* Header */}
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
                <Text style={SharedStyles.headerTitle}>Atributos de productos</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

            {/* Content Header & Action */}
            <View style={styles.topBanner}>
                <View style={styles.topBannerTextContainer}>
                    <Text style={styles.topBannerTitle}>Catálogo de atributos</Text>
                    <Text style={styles.topBannerSubtitle}>
                        Configurá los atributos y sus valores para las variantes de productos.
                    </Text>
                </View>
                <AppButton
                    title="+ Nuevo atributo"
                    onPress={handleOpenCreate}
                    style={styles.addButton}
                />
            </View>

            {/* List */}
            <FlatList
                data={attributes}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <EmptyState
                        title="Sin atributos registrados"
                        description="Creá tu primer atributo como Color o Talle para comenzar a definir variantes."
                        actionLabel="+ Crear Atributo"
                        onAction={handleOpenCreate}
                    />
                }
            />

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
    listContainer: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    inactiveCard: {
        backgroundColor: Colors.background,
        opacity: 0.8,
    },
    cardMain: {
        flex: 1,
        marginRight: Spacing.md,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    attributeName: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    inactiveText: {
        color: Colors.textSecondary,
    },
    valuesCountText: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
        borderRadius: 12,
        gap: 4,
    },
    activeBadge: {
        backgroundColor: Colors.successSoft,
    },
    inactiveBadge: {
        backgroundColor: Colors.muted,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    actionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    switchContainer: {
        transform: [{ scale: 0.85 }],
    },
    iconButton: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: Colors.primaryLight,
    },
});
