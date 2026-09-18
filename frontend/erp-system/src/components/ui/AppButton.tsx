import {
    Pressable,
    StyleProp,
    StyleSheet,
    Text,
    ViewStyle,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

type AppButtonProps = {
    title: string;
    onPress: () => void;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
};

export function AppButton({
    title,
    onPress,
    disabled = false,
    style,
}: AppButtonProps) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={[
                styles.button,
                disabled && styles.disabled,
                style,
            ]}
        >
            <Text style={styles.text}>
                {title}
            </Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    button: {
        backgroundColor: Colors.primary,

        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,

        borderRadius: 10,

        alignItems: 'center',
    },

    text: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '600',
    },

    disabled: {
        opacity: 0.55,
    },
});
