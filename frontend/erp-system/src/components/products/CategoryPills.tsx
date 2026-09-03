import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { Category } from '@/types/product';

interface CategoryPillsProps {
    categories: Category[];
    selectedCategoryId: string | null;
    onSelect: (categoryId: string | null) => void;
}

export function CategoryPills({
    categories,
    selectedCategoryId,
    onSelect,
}: CategoryPillsProps) {
    return (
        <View style={styles.categorySection}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScroll}
            >
                <Pressable
                    style={[
                        styles.categoryPill,
                        selectedCategoryId === null && styles.categoryPillActive,
                    ]}
                    onPress={() => onSelect(null)}
                >
                    <Text
                        style={[
                            styles.categoryPillText,
                            selectedCategoryId === null && styles.categoryPillTextActive,
                        ]}
                    >
                        Todas las categorías
                    </Text>
                </Pressable>

                {categories.map((cat) => {
                    const isSelected = selectedCategoryId === cat.id;
                    return (
                        <Pressable
                            key={cat.id}
                            style={[
                                styles.categoryPill,
                                isSelected && styles.categoryPillActive,
                            ]}
                            onPress={() => onSelect(isSelected ? null : cat.id)}
                        >
                            <Text
                                style={[
                                    styles.categoryPillText,
                                    isSelected && styles.categoryPillTextActive,
                                ]}
                            >
                                {cat.name}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    categorySection: {
        marginBottom: Spacing.xs,
    },

    categoryScroll: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.xs,
        paddingVertical: 4,
    },

    categoryPill: {
        paddingHorizontal: Spacing.md,
        paddingVertical: 5,
        borderRadius: 8,
        backgroundColor: '#F1F5F9',
    },

    categoryPillActive: {
        backgroundColor: Colors.primary,
    },

    categoryPillText: {
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
    },

    categoryPillTextActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
});
