import { StyleSheet, Text, View } from 'react-native';

import { Radius } from '@/constants/spacing';
import { Tone, ToneColors } from '@/constants/tones';

type StatusPillProps = {
    label: string;
    tone: Tone;
};

/** Estado en una píldora de color: Pagado, A preparar, Sin stock. */
export function StatusPill({ label, tone }: StatusPillProps) {
    const colors = ToneColors[tone];
    return (
        <View style={[styles.pill, { backgroundColor: colors.background }]}>
            <Text style={[styles.text, { color: colors.foreground }]}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    pill: {
        alignSelf: 'flex-start',
        borderRadius: Radius.pill,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    text: {
        fontSize: 11,
        fontWeight: '700',
    },
});
