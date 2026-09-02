import {
    StyleSheet,
    TextInput,
    TextInputProps,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

type AppInputProps = TextInputProps;

export function AppInput({
    style,
    ...props
}: AppInputProps) {
    return (
        <TextInput
            style={[styles.input, style]}
            placeholderTextColor={Colors.textSecondary}
            {...props}
        />
    );
}

const styles = StyleSheet.create({
    input: {
        height: 48,

        borderWidth: 1,
        borderColor: Colors.border,

        borderRadius: 10,

        paddingHorizontal: Spacing.md,

        fontSize: 16,

        backgroundColor: Colors.surface,
        color: Colors.text,
    },
});