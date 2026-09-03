import { SymbolView } from 'expo-symbols';
import { Pressable, TextInput, View, StyleSheet } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

interface ProductsSearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
}

export function ProductsSearchBar({ value, onChangeText }: ProductsSearchBarProps) {
    return (
        <View style={styles.container}>
            <SymbolView
                name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
                size={20}
                tintColor={Colors.textSecondary}
                style={styles.icon}
            />

            <TextInput
                style={styles.input}
                placeholder="Buscar por nombre o SKU..."
                placeholderTextColor={Colors.textSecondary}
                value={value}
                onChangeText={onChangeText}
                returnKeyType="search"
            />

            {value.length > 0 && (
                <Pressable
                    onPress={() => onChangeText('')}
                    style={styles.clearButton}
                >
                    <SymbolView
                        name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
                        size={18}
                        tintColor={Colors.textSecondary}
                    />
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        height: 44,
    },

    icon: {
        marginRight: Spacing.sm,
    },

    input: {
        flex: 1,
        fontSize: 14,
        color: Colors.text,
        height: '100%',
    },

    clearButton: {
        padding: 4,
    },
});
