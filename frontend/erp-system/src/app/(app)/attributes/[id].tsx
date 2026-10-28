import { router, useLocalSearchParams } from 'expo-router';
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
import { ProductAttributeValueFormModal } from '@/components/attributes/ProductAttributeValueFormModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { MenuListItem } from '@/components/ui/MenuListItem';
import { NotFound } from '@/components/ui/NotFound';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatusPill } from '@/components/ui/StatusPill';
import { SwitchRow } from '@/components/ui/SwitchRow';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import {
    useAttributes,
    useSetAttributeActive,
    useSetAttributeValueActive,
} from '@/hooks/use-attribute-queries';
import { showErrorToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
import { ProductAttributeValue } from '@/types/product';

export default function AttributeDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    // El detalle sale de las listas completas (cacheadas, compartidas con Atributos): tras un
    // F5 se piden y la pantalla se arma cuando llegan.
    const { attributes, attributeValues, isLoading, error, refresh } = useAttributes();
    const setAttributeActive = useSetAttributeActive();
    const setValueActive = useSetAttributeValueActive();

    const attribute = attributes.find((item) => item.id === id);
    const values = attribute
        ? attributeValues.filter((value) => value.attributeId === attribute.id)
        : [];

    const [isAttributeModalVisible, setIsAttributeModalVisible] = useState(false);
    const [isValueModalVisible, setIsValueModalVisible] = useState(false);
    const [editingValue, setEditingValue] = useState<ProductAttributeValue | null>(null);

    if (isLoading) {
        return <LoadingState />;
    }

    if (!attribute && error) {
        return (
            <Screen style={styles.container}>
                <EmptyState
                    title="No se pudo cargar el atributo"
                    description={error}
                    actionLabel="Reintentar"
                    onAction={refresh}
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

    const currentAttribute = attribute;

    async function handleToggleAttribute() {
        try {
            await setAttributeActive.mutateAsync({ id: currentAttribute.id, active: !currentAttribute.active });
        } catch (toggleError) {
            showErrorToast(toggleError, 'No se pudo cambiar el estado del atributo.');
        }
    }

    async function handleToggleValue(value: ProductAttributeValue) {
        try {
            await setValueActive.mutateAsync({ id: value.id, active: !value.active });
        } catch (toggleError) {
            showErrorToast(toggleError, 'No se pudo cambiar el estado del valor.');
        }
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
            <View style={[SharedStyles.card, SharedStyles.listItem, !item.active && SharedStyles.listItemInactive]}>
                <View style={SharedStyles.listItemTexts}>
                    <Text style={SharedStyles.listItemTitle}>{item.name}</Text>
                    {!item.active ? <StatusPill label="Inactivo" tone="neutral" /> : null}
                </View>

                <Switch
                    value={item.active}
                    onValueChange={() => void handleToggleValue(item)}
                    trackColor={{ false: Colors.track, true: Colors.primary }}
                    thumbColor={Colors.white}
                    accessibilityLabel={item.active ? `Desactivar ${item.name}` : `Activar ${item.name}`}
                />
                <Pressable
                    style={({ pressed }) => [styles.iconButton, pressed && SharedStyles.pressed]}
                    onPress={() => handleOpenEditValue(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`Renombrar ${item.name}`}
                >
                    <SymbolView
                        name={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                        size={18}
                        tintColor={Colors.primary}
                    />
                </Pressable>
            </View>
        );
    }

    return (
        <Screen style={styles.container}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow="Atributo"
                title={attribute.name}
                right={<HeaderButton label="Valor" accessibilityLabel="Nuevo valor" onPress={handleOpenCreateValue} />}
            />

            <FlatList
                data={values}
                keyExtractor={(item) => item.id}
                renderItem={renderValueItem}
                contentContainerStyle={SharedStyles.pageList}
                ListHeaderComponent={(
                    <View style={styles.listHeader}>
                        <ListGroup>
                            <SwitchRow
                                title={attribute.active ? 'Activo' : 'Inactivo'}
                                subtitle="Los inactivos no se ofrecen al cargar variantes"
                                value={attribute.active}
                                onValueChange={() => void handleToggleAttribute()}
                            />
                            <MenuListItem
                                title="Cambiar nombre"
                                iconName={{ ios: 'pencil', android: 'edit', web: 'edit' }}
                                tone="primary"
                                onPress={() => setIsAttributeModalVisible(true)}
                            />
                        </ListGroup>
                        <SectionHeader title={`Valores (${values.length})`} />
                    </View>
                )}
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
    listHeader: {
        gap: Spacing.md,
        marginBottom: Spacing.xs,
    },
    iconButton: {
        padding: 8,
        borderRadius: Radius.sm,
        backgroundColor: Colors.primaryLight,
    },
});
