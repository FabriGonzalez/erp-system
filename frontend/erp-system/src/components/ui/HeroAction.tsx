import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

import { IconName } from './icon-name';

type HeroActionProps = {
    icon: IconName;
    title: string;
    subtitle?: string;
    onPress: () => void;
};

/** La acción principal de una pantalla (Nueva venta, Nuevo envío): una sola por pantalla. */
export function HeroAction({ icon, title, subtitle, onPress }: HeroActionProps) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={title}
            style={({ pressed }) => [styles.card, SharedStyles.raised, pressed && styles.pressed]}
        >
            <View style={styles.topRow}>
                <View style={styles.iconBox}>
                    <SymbolView name={icon} size={28} tintColor={Colors.white} />
                </View>
                <View style={styles.arrow}>
                    <SymbolView
                        name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }}
                        size={18}
                        tintColor={Colors.primary}
                    />
                </View>
            </View>
            <View style={styles.texts}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: Colors.primary,
        borderRadius: Radius.xl,
        padding: Spacing.lg + Spacing.xs,
        gap: Spacing.lg,
    },
    pressed: {
        backgroundColor: Colors.primaryDark,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: Radius.lg,
        backgroundColor: 'rgba(255, 255, 255, 0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    arrow: {
        width: 36,
        height: 36,
        borderRadius: Radius.pill,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
    },
    texts: {
        gap: Spacing.xs,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: Colors.white,
    },
    subtitle: {
        fontSize: 14,
        color: Colors.white,
    },
});
