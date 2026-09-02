import {
    StyleSheet,
    View,
    ViewProps,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

type ScreenProps = ViewProps;

export function Screen({
    style,
    children,
    ...props
}: ScreenProps) {
    return (
        <View
            style={[styles.container, style]}
            {...props}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
        padding: Spacing.xl,
    },
});