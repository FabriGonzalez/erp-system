import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

interface SuccessBannerProps {
    message: string;
}

export function SuccessBanner({ message }: SuccessBannerProps) {
    return (
        <View style={styles.banner}>
            <SymbolView
                name={{
                    ios: 'checkmark.circle.fill',
                    android: 'check_circle',
                    web: 'check_circle',
                }}
                size={20}
                tintColor={Colors.success}
            />

            <Text style={styles.text}>{message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#BBF7D0',
    },

    text: {
        color: '#166534',
        fontSize: 14,
        fontWeight: '600',
    },
});
