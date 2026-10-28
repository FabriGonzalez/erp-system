import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { Radius } from '@/constants/spacing';
import { Tone, ToneColors } from '@/constants/tones';
import { SharedStyles } from '@/styles/shared';

import { IconName } from './icon-name';

type ActionChipProps = {
    label: string;
    icon: IconName;
    onPress: () => void;
    tone?: Tone;
    loading?: boolean;
    disabled?: boolean;
};

/** Acción chica dentro de una tarjeta (Sucursales → Usuarios, Desactivar), en el color de su tono. */
export function ActionChip({ label, icon, onPress, tone = 'primary', loading = false, disabled = false }: ActionChipProps) {
    const colors = ToneColors[tone];
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled || loading}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || loading, busy: loading }}
            style={({ pressed }) => [styles.chip, { backgroundColor: colors.background }, pressed && SharedStyles.pressed]}
        >
            {loading
                ? <ActivityIndicator size="small" color={colors.foreground} />
                : <SymbolView name={icon} size={15} tintColor={colors.foreground} />}
            <Text style={[styles.text, { color: colors.foreground }]}>{label}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: Radius.sm,
    },
    text: {
        fontSize: 12,
        fontWeight: '700',
    },
});
