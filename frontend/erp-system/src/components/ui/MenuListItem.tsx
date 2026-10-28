import { SymbolView } from 'expo-symbols';
import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Tone } from '@/constants/tones';

import { IconBadge } from './IconBadge';
import { IconName } from './icon-name';

type MenuListItemProps = {
    title: string;
    subtitle?: string;
    iconName?: IconName;
    tone?: Tone;
    onPress: () => void;
    showChevron?: boolean;
    /** Para acciones destructivas (Cerrar sesión). */
    danger?: boolean;
    /** A la derecha, antes de la flecha: una píldora con un contador. */
    badge?: ReactNode;
};

/** Una opción de menú dentro de un ListGroup. */
export function MenuListItem({
    title,
    subtitle,
    iconName,
    tone = 'neutral',
    onPress,
    showChevron = true,
    danger = false,
    badge,
}: MenuListItemProps) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.item, pressed && styles.pressed]}
        >
            {iconName ? <IconBadge icon={iconName} tone={danger ? 'danger' : tone} size={38} /> : null}
            <View style={styles.texts}>
                <Text style={[styles.title, danger && styles.danger]}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            {badge}
            {showChevron ? (
                <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                    size={18}
                    tintColor={Colors.textTertiary}
                />
            ) : null}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md + 2,
        backgroundColor: Colors.surface,
    },
    pressed: {
        backgroundColor: Colors.muted,
    },
    texts: {
        flex: 1,
        gap: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    danger: {
        color: Colors.error,
    },
    subtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
});
