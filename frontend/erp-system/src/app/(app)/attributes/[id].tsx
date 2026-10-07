import { router, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
    FlatList,
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';

import { ProductAttributeFormModal } from '@/components/attributes/ProductAttributeFormModal';
import { ProductAttributeValueFormModal } from '@/components/attributes/ProductAttributeValueFormModal';
import { AppButton } from '@/components/ui/AppButton';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useProductAttributeStore } from '@/stores/product-attribute-store';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { ProductAttributeValue } from '@/types/product';

export default function AttributeDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const {
        getAttributeById,
        getAttributeValuesByAttributeId,
        fetchAttributeById,
        activateAttribute,
        deactivateAttribute,
        activateAttributeValue,
        deactivateAttributeValue,
        isLoading,
        error,
    } = useProductAttributeStore();
    const token = useAuthStore((state) => state.token);

    useEffect(() => {
        if (id && token) {
            void fetchAttributeById(id, token);
        }
    }, [id, token, fetchAttributeById]);

    const attribute = getAttributeById(id ?? '');
    const values = attribute ? getAttributeValuesByAttributeId(attribute.id) : [];

    const [isAttributeModalVisible, setIsAttributeModalVisible] = useState(false);
    const [isValueModalVisible, setIsValueModalVisible] = useState(false);
    const [editingValue, setEditingValue] = useState<ProductAttributeValue | null>(null);

    if (isLoading && !attribute) {
        return <LoadingState />;
    }

    if (!attribute && error) {
        return (
            <Screen style={styles.container}>
                <EmptyState
                    title="No se pudo cargar el atributo"
                    description={error}
                    actionLabel="Reintentar"
                    onAction={() => id && token && void fetchAttributeById(id, token)}
                />
            </Screen>
        );
    }

    if (!attribute) {
        return (
            <NotFound
                headerTitle="Atributo"
                title="Atributo no encontrado"
                description="El atributo que intentas ver no existe o fue eliminado."
                actionLabel="Volver a atributos"
            />
        );
    }

    function handleOpenCreateValue() {
        setEditingValue(null);
        setIsValueModalVisible(true);
    }

    function handleOpenEditValue(val: ProductAttributeValue) {
        setEditingValue(val);
        setIsValueModalVisible(true);
    }

    function renderValueItem({ item }: { item: ProductAttributeValue }) {
        return (
            <View style={[styles.valueCard, !item.active && styles.inactiveValueCard]}>
                <View style={styles.valueInfo}>
                    <Text style={[styles.valueName, !item.active && styles.inactiveText]}>
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

                <View style={styles.valueActions}>
                    <View style={styles.switchContainer}>
                        <Switch
                            value={item.active}
                            onValueChange={() => {
                                if (!token) return;
                                void (item.active
                                    ? deactivateAttributeValue(item.id, token)
                                    : activateAttributeValue(item.id, token));
                            }}
                            trackColor={{ false: Colors.track, true: Colors.primary }}
                            thumbColor={Colors.white}
                        />
                    </View>

                    <Pressable
                        style={({ pressed }) => [styles.iconButton, pressed && SharedStyles.pressed]}
                        onPress={() => handleOpenEditValue(item)}
                    >
                        <SymbolView
                            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                            size={18}
                            tintColor={Colors.primary}
                        />
                    </Pressable>
                </View>
            </View>
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
                <Text style={SharedStyles.headerTitle}>{attribute.name}</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

            {/* Attribute Main Header Card */}
            <View style={styles.attributeHeaderCard}>
                <View style={styles.attributeHeaderMain}>
                    <Text style={styles.attributeHeaderTitle}>{attribute.name}</Text>
                    <Text style={styles.attributeHeaderSubtitle}>
                        {values.length === 1 ? '1 valor configurado' : `${values.length} valores configurados`}
                    </Text>
                </View>

                <View style={styles.attributeHeaderActions}>
                    <Pressable
                        style={({ pressed }) => [styles.editAttrButton, pressed && SharedStyles.pressed]}
                        onPress={() => setIsAttributeModalVisible(true)}
                    >
                        <SymbolView
                            name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                            size={16}
                            tintColor={Colors.primary}
                        />
                        <Text style={styles.editAttrButtonText}>Editar nombre</Text>
                    </Pressable>

                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>
                            {attribute.active ? 'Activo' : 'Inactivo'}
                        </Text>
                        <Switch
                            value={attribute.active}
                            onValueChange={() => {
                                if (!token) return;
                                void (attribute.active
                                    ? deactivateAttribute(attribute.id, token)
                                    : activateAttribute(attribute.id, token));
                            }}
                            trackColor={{ false: Colors.track, true: Colors.primary }}
                            thumbColor={Colors.white}
                        />
                    </View>
                </View>
            </View>

            {/* Values Section Header */}
            <View style={styles.sectionHeader}>
                <Text style={SharedStyles.cardTitle}>Valores ({values.length})</Text>
                <AppButton
                    title="+ Nuevo valor"
                    onPress={handleOpenCreateValue}
                    style={styles.addValueButton}
                />
            </View>

            {isLoading ? (
                <ActivityIndicator color={Colors.primary} style={styles.loader} />
            ) : error ? (
                <EmptyState
                    title="No se pudo cargar el atributo"
                    description={error}
                    actionLabel="Reintentar"
                    onAction={() => id && token && void fetchAttributeById(id, token)}
                />
            ) : null}

            <FlatList
                data={isLoading || error ? [] : values}
                keyExtractor={(item) => item.id}
                renderItem={renderValueItem}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={
                    <EmptyState
                        title="Sin valores creados"
                        description={`Agregá valores para el atributo ${attribute.name} (por ejemplo: Azul, Rojo, Verde).`}
                        actionLabel="+ Crear Valor"
                        onAction={handleOpenCreateValue}
                    />
                }
            />

            {/* Modal para editar Atributo */}
            <ProductAttributeFormModal
                visible={isAttributeModalVisible}
                attributeId={attribute.id}
                initialName={attribute.name}
                onClose={() => setIsAttributeModalVisible(false)}
            />

            {/* Modal para crear/editar Valor */}
            <ProductAttributeValueFormModal
                visible={isValueModalVisible}
                attributeId={attribute.id}
                attributeName={attribute.name}
                valueId={editingValue?.id}
                initialName={editingValue?.name ?? ''}
                onClose={() => {
                    setIsValueModalVisible(false);
                    setEditingValue(null);
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
    attributeHeaderCard: {
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: Spacing.md,
    },
    attributeHeaderMain: {
        flex: 1,
        minWidth: 160,
    },
    attributeHeaderTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    attributeHeaderSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    attributeHeaderActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
    },
    editAttrButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: 8,
        backgroundColor: Colors.primaryLight,
    },
    editAttrButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.xs,
    },
    switchLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    addValueButton: {
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    listContainer: {
        padding: Spacing.lg,
        gap: Spacing.sm,
    },
    valueCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        borderRadius: 10,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    inactiveValueCard: {
        backgroundColor: Colors.background,
        opacity: 0.8,
    },
    valueInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        flex: 1,
    },
    valueName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    inactiveText: {
        color: Colors.textSecondary,
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
    valueActions: {
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
