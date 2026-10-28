import { SymbolView } from 'expo-symbols';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Tone } from '@/constants/tones';
import { SharedStyles } from '@/styles/shared';

import { IconBadge } from './IconBadge';
import { IconName } from './icon-name';

type ActionCardProps = {
    icon: IconName;
    tone?: Tone;
    title: string;
    subtitle?: string;
    onPress: () => void;
    /** En lugar de la flecha: una píldora, un contador... */
    right?: ReactNode;
};

/** Acción secundaria o acceso: tarjeta blanca con el ícono en su color (Venta rápida, A preparar). */
export function ActionCard({ icon, tone = 'primary', title, subtitle, onPress, right }: ActionCardProps) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={title}
            style={({ pressed }) => [SharedStyles.card, styles.row, pressed && styles.pressed]}
        >
            <IconBadge icon={icon} tone={tone} size={44} />
            <View style={styles.texts}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {right ?? (
                <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                    size={18}
                    tintColor={Colors.textTertiary}
                />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md + 2,
        paddingVertical: Spacing.md + 2,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.lg,
    },
    pressed: {
        backgroundColor: Colors.muted,
    },
    texts: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    subtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
});
