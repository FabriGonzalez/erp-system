import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ListGroup } from '@/components/ui/ListGroup';
import { ModalCard } from '@/components/ui/ModalCard';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { Category } from '@/types/category';

interface CategoryModalProps {
    visible: boolean;
    categories: Category[];
    selectedCategoryId: string;
    onSelect: (categoryId: string) => void;
    onClose: () => void;
    // Si se pasa, aparece "Crear categoría" debajo de la lista. El llamador cierra este
    // modal antes de abrir el alta: dos Modal superpuestos fallan en iOS.
    onCreateCategory?: () => void;
    // iOS: se llama cuando el modal terminó de cerrarse. Recién ahí se puede abrir otro.
    onDismiss?: () => void;
}

export function CategoryModal({
    visible,
    categories,
    selectedCategoryId,
    onSelect,
    onClose,
    onCreateCategory,
    onDismiss,
}: CategoryModalProps) {
    function handleSelect(categoryId: string) {
        onSelect(categoryId);
        onClose();
    }

    return (
        <ModalCard
            visible={visible}
            title="Elegir categoría"
            onClose={onClose}
            onDismiss={onDismiss}
        >
            {categories.length === 0 ? (
                <Text style={styles.emptyText}>Todavía no hay categorías.</Text>
            ) : (
                <ListGroup>
                    {categories.map((category) => {
                        const isSelected = category.id === selectedCategoryId;
                        return (
                            <Pressable
                                key={category.id}
                                onPress={() => handleSelect(category.id)}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isSelected }}
                                style={({ pressed }) => [
                                    styles.row,
                                    isSelected && styles.rowSelected,
                                    pressed && SharedStyles.listItemPressed,
                                ]}
                            >
                                <View style={SharedStyles.listItemTexts}>
                                    <Text style={[styles.name, isSelected && styles.nameSelected]}>
                                        {category.name}{category.active ? '' : ' (inactiva)'}
                                    </Text>
                                    {category.description ? (
                                        <Text style={SharedStyles.listItemMeta} numberOfLines={2}>
                                            {category.description}
                                        </Text>
                                    ) : null}
                                </View>
                                {isSelected ? (
                                    <SymbolView
                                        name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                                        size={22}
                                        tintColor={Colors.primary}
                                    />
                                ) : null}
                            </Pressable>
                        );
                    })}
                </ListGroup>
            )}

            {onCreateCategory ? (
                <Pressable
                    style={({ pressed }) => [styles.createButton, pressed && SharedStyles.pressed]}
                    onPress={onCreateCategory}
                    accessibilityRole="button"
                >
                    <SymbolView
                        name={{ ios: 'plus', android: 'add', web: 'add' }}
                        size={18}
                        tintColor={Colors.primary}
                    />
                    <Text style={styles.createButtonText}>Crear categoría</Text>
                </Pressable>
            ) : null}
        </ModalCard>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md + 2,
        backgroundColor: Colors.surface,
    },
    rowSelected: {
        backgroundColor: Colors.primaryLight,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    nameSelected: {
        color: Colors.primary,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.textSecondary,
        textAlign: 'center',
        paddingVertical: Spacing.md,
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: Spacing.xs,
        minHeight: 48,
        borderRadius: Radius.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.primary,
    },
    createButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.primary,
    },
});
