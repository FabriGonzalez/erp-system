import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { useActiveBranch } from '@/hooks/use-branch-queries';
import { SharedStyles } from '@/styles/shared';

/** La sucursal activa en el encabezado; tocarla lleva a cambiarla. */
export function BranchChip() {
    const activeBranch = useActiveBranch();
    return (
        <Pressable
            onPress={() => router.push('/settings/active-branch')}
            accessibilityRole="button"
            accessibilityLabel={`Sucursal activa: ${activeBranch?.name ?? 'ninguna'}. Cambiar`}
            style={({ pressed }) => [styles.chip, pressed && SharedStyles.pressed]}
        >
            <SymbolView
                name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
                size={16}
                tintColor={Colors.textSecondary}
            />
            <Text style={styles.text} numberOfLines={1}>{activeBranch?.name ?? 'Elegir sucursal'}</Text>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        maxWidth: 160,
        paddingVertical: 6,
        paddingHorizontal: Spacing.sm + 2,
        borderRadius: Radius.pill,
        borderWidth: 1,
        borderColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    text: {
        flexShrink: 1,
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
    },
});
