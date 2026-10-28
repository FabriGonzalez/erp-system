import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Tone } from '@/constants/tones';
import { SharedStyles } from '@/styles/shared';

import { IconBadge } from './IconBadge';
import { IconName } from './icon-name';

type StatTileProps = {
    label: string;
    value: string;
    icon?: IconName;
    tone?: Tone;
    /** Si la tarjeta lleva a algún lado (A preparar → la lista). */
    onPress?: () => void;
};

/** Un número grande con su etiqueta: vendido hoy, a preparar, sin stock. Van de a dos o tres por fila. */
export function StatTile({ label, value, icon, tone = 'primary', onPress }: StatTileProps) {
    const content = (
        <>
            {icon ? <IconBadge icon={icon} tone={tone} size={40} /> : null}
            <View style={styles.texts}>
                {icon ? null : <Text style={styles.label}>{label}</Text>}
                <Text style={styles.value} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
                {icon ? <Text style={styles.label}>{label}</Text> : null}
            </View>
        </>
    );

    if (!onPress) {
        return <View style={[SharedStyles.card, styles.tile]}>{content}</View>;
    }
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value}`}
            style={({ pressed }) => [SharedStyles.card, styles.tile, pressed && styles.pressed]}
        >
            {content}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    tile: {
        flex: 1,
        padding: Spacing.md + 2,
        borderRadius: Radius.lg,
        gap: Spacing.sm + 2,
    },
    pressed: {
        backgroundColor: Colors.muted,
    },
    texts: {
        gap: 2,
    },
    label: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    value: {
        fontSize: 21,
        fontWeight: '800',
        color: Colors.text,
    },
});
