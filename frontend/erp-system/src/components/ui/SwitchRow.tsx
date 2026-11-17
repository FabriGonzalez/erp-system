import { StyleSheet, Switch, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

type SwitchRowProps = {
    title: string;
    subtitle?: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
};

/** Una opción que se prende o apaga, dentro de un ListGroup (sucursales de un usuario, permisos de un rol). */
export function SwitchRow({ title, subtitle, value, onValueChange, disabled = false }: SwitchRowProps) {
    return (
        <View style={styles.row}>
            <View style={styles.texts}>
                <Text style={styles.title}>{title}</Text>
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <Switch
                value={value}
                disabled={disabled}
                onValueChange={onValueChange}
                trackColor={{ false: Colors.track, true: Colors.primary }}
                thumbColor={Colors.white}
                accessibilityLabel={title}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
        paddingVertical: Spacing.sm + 2,
        paddingHorizontal: Spacing.md + 2,
        backgroundColor: Colors.surface,
    },
    texts: {
        flex: 1,
        gap: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    subtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
});
