import { SymbolView } from 'expo-symbols';
import {
    Pressable,
    StyleSheet,
    TextInputProps,
    View,
} from 'react-native';

import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

type SearchBarProps = Omit<
    TextInputProps,
    'value' | 'onChangeText'
> & {
    value: string;
    onChangeText: (text: string) => void;
};

export function SearchBar({
    value,
    onChangeText,
    ...inputProps
}: SearchBarProps) {
    return (
        <View style={styles.container}>
            <SymbolView
                name={{
                    ios: 'magnifyingglass',
                    android: 'search',
                    web: 'search',
                }}
                size={20}
                tintColor={Colors.textSecondary}
                style={styles.icon}
            />

            <AppInput
                {...inputProps}
                style={styles.input}
                placeholder={inputProps.placeholder}
                value={value}
                onChangeText={onChangeText}
                underlineColorAndroid="transparent"

            />

            {value.length > 0 && (
                <Pressable
                    onPress={() => onChangeText('')}
                    style={styles.clearButton}
                    hitSlop={8}
                >
                    <SymbolView
                        name={{
                            ios: 'xmark.circle.fill',
                            android: 'cancel',
                            web: 'cancel',
                        }}
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
        height: 44,
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.sm,
        marginBottom: Spacing.sm,
        paddingHorizontal: Spacing.md,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },

    icon: {
        marginRight: Spacing.sm,
    },

    input: {
        flex: 1,
        height: '100%',
        borderWidth: 0,
        borderColor: 'transparent',
        borderRadius: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
        fontSize: 14,
        ...({ outlineStyle: 'none' } as any),
    },

    clearButton: {
        padding: 4,
    },
});
