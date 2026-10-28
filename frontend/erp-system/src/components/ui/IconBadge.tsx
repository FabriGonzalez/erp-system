import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';

import { Tone, ToneColors } from '@/constants/tones';

import { IconName } from './icon-name';

type IconBadgeProps = {
    icon: IconName;
    tone?: Tone;
    /** Lado del cuadrado; el ícono ocupa la mitad. */
    size?: number;
};

/** Ícono sobre un cuadrado redondeado del color de su tono (Inventario en verde azulado, etc.). */
export function IconBadge({ icon, tone = 'primary', size = 40 }: IconBadgeProps) {
    const colors = ToneColors[tone];
    return (
        <View
            style={{
                width: size,
                height: size,
                borderRadius: Math.round(size * 0.3),
                backgroundColor: colors.background,
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <SymbolView name={icon} size={Math.round(size * 0.5)} tintColor={colors.foreground} />
        </View>
    );
}
