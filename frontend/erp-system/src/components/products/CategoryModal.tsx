import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Category } from '@/types/product';

interface CategoryModalProps {
    visible: boolean;
    categories: Category[];
    selectedCategoryId: string;
    onSelect: (categoryId: string) => void;
    onClose: () => void;
}

export function CategoryModal({
    visible,
    categories,
    selectedCategoryId,
    onSelect,
    onClose,
}: CategoryModalProps) {
    function handleSelect(categoryId: string) {
        onSelect(categoryId);
        onClose();
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Seleccionar Categoría</Text>

                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <SymbolView
                                name={{ ios: 'xmark.circle.fill', android: 'close', web: 'close' }}
                                size={24}
                                tintColor={Colors.textSecondary}
                            />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.list}>
                        {categories.map((cat) => {
                            const isSelected = cat.id === selectedCategoryId;
                            return (
                                <Pressable
                                    key={cat.id}
                                    style={[
                                        styles.categoryItem,
                                        isSelected && styles.categoryItemSelected,
                                    ]}
                                    onPress={() => handleSelect(cat.id)}
                                >
                                    <View style={styles.categoryItemInfo}>
                                        <Text
                                            style={[
                                                styles.categoryItemName,
                                                isSelected && styles.categoryItemNameSelected,
                                            ]}
                                        >
                                            {cat.name}
                                        </Text>
                                        {cat.description ? (
                                            <Text style={styles.categoryItemDesc}>
                                                {cat.description}
                                            </Text>
                                        ) : null}
                                    </View>

                                    {isSelected && (
                                        <SymbolView
                                            name={{
                                                ios: 'checkmark.circle.fill',
                                                android: 'check_circle',
                                                web: 'check_circle',
                                            }}
                                            size={20}
                                            tintColor={Colors.primary}
                                        />
                                    )}
                                </Pressable>
                            );
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },

    content: {
        backgroundColor: Colors.surface,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '60%',
        paddingBottom: Spacing.xl,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },

    title: {
        fontSize: 17,
        fontWeight: '700',
        color: Colors.text,
    },

    closeButton: {
        padding: 4,
    },

    list: {
        padding: Spacing.md,
    },

    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: 10,
        marginBottom: Spacing.xs,
    },

    categoryItemSelected: {
        backgroundColor: '#EFF6FF',
    },

    categoryItemInfo: {
        flex: 1,
        marginRight: Spacing.sm,
    },

    categoryItemName: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },

    categoryItemNameSelected: {
        color: Colors.primary,
    },

    categoryItemDesc: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
});
