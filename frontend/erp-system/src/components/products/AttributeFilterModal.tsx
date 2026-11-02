import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { FilterChip } from '@/components/ui/FilterChip';
import { ModalCard } from '@/components/ui/ModalCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAttributes } from '@/hooks/use-attribute-queries';
import { AttributeFilter } from '@/utils/attribute-filter';

type AttributeFilterModalProps = {
    value: AttributeFilter;
    onApply: (filter: AttributeFilter) => void;
    onClose: () => void;
};

/**
 * Elección de valores de atributo para filtrar productos: varios por atributo. Se aplica con
 * "Listo" (una sola búsqueda); cerrar descarta lo elegido. Montalo solo mientras está abierto:
 * cada apertura parte del filtro vigente.
 */
export function AttributeFilterModal({ value, onApply, onClose }: AttributeFilterModalProps) {
    const { attributes, attributeValues, isLoading, error } = useAttributes();
    const [draft, setDraft] = useState<AttributeFilter>(value);

    // Solo atributos y valores activos, y atributos que tengan alguno.
    const groups = attributes
        .filter((attribute) => attribute.active)
        .map((attribute) => ({
            attribute,
            values: attributeValues.filter((item) => item.active && item.attributeId === attribute.id),
        }))
        .filter((group) => group.values.length > 0);

    function toggle(attributeId: string, valueId: string) {
        setDraft((current) => {
            const selected = current[attributeId] ?? [];
            const next = selected.includes(valueId)
                ? selected.filter((id) => id !== valueId)
                : [...selected, valueId];
            const rest = { ...current };
            delete rest[attributeId];
            return next.length ? { ...rest, [attributeId]: next } : rest;
        });
    }

    // Lo que quedó elegido de un valor que ya no está activo no se ve: no se aplica.
    function handleApply() {
        const visible: AttributeFilter = {};
        for (const { attribute, values } of groups) {
            const selected = (draft[attribute.id] ?? []).filter((id) => values.some((item) => item.id === id));
            if (selected.length) visible[attribute.id] = selected;
        }
        onApply(visible);
    }

    return (
        <ModalCard
            title="Filtrar por atributos"
            subtitle="Muestra los productos con una variante que tenga lo elegido"
            onClose={onClose}
            error={groups.length ? null : error}
            footer={[
                <AppButton key="clear" title="Limpiar" variant="secondary" onPress={() => setDraft({})} />,
                <AppButton key="apply" title="Listo" onPress={handleApply} disabled={isLoading} />,
            ]}
        >
            {isLoading ? (
                <ActivityIndicator color={Colors.primary} />
            ) : groups.length === 0 && !error ? (
                <Text style={styles.empty}>No hay atributos activos para filtrar.</Text>
            ) : (
                groups.map(({ attribute, values }) => (
                    <View key={attribute.id} style={styles.group}>
                        <SectionHeader title={attribute.name} />
                        <View style={styles.chips}>
                            {values.map((item) => (
                                <FilterChip
                                    key={item.id}
                                    label={item.name}
                                    selected={draft[attribute.id]?.includes(item.id) ?? false}
                                    onPress={() => toggle(attribute.id, item.id)}
                                />
                            ))}
                        </View>
                    </View>
                ))
            )}
        </ModalCard>
    );
}

const styles = StyleSheet.create({
    group: {
        gap: Spacing.sm,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    empty: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
});
