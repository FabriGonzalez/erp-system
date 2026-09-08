import {
    Pressable,
    StyleSheet,
    Text,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

type AppButtonProps = {
    title: string;
    onPress: () => void;
};

export function AppButton({
    title,
    onPress,
}: AppButtonProps) {
    return (
        <Pressable
            style={styles.button}
            onPress={onPress}
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
});