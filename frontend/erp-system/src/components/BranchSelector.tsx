import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useBranchStore } from '@/stores/branch-store';
import { SharedStyles } from '@/styles/shared';

type BranchSelectorProps = {
    onPress?: () => void;
};

export function BranchSelector({ onPress }: BranchSelectorProps) {
    const activeBranch = useBranchStore(
        (state) => state.activeBranch
    );

    function handlePress() {
        if (onPress) {
            onPress();
        } else {
            router.push('/settings/active-branch');
        }
    }

    return (
        <Pressable
            style={({ pressed }) => [styles.container, pressed && SharedStyles.pressed]}
            onPress={handlePress}
        >
            <View>
                <Text style={styles.label}>
                    Sucursal activa
                </Text>

                <Text style={styles.branchName}>
                    {activeBranch?.name ?? 'Seleccionar sucursal'}
                </Text>
            </View>

            <Text style={styles.arrow}>
                ▼
            </Text>
        </Pressable>
    );
}


const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.surface,

        borderWidth: 1,
        borderColor: Colors.border,

        borderRadius: 12,

        padding: Spacing.md,

        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    label: {
        fontSize: 12,
        color: Colors.textSecondary,
    },

    branchName: {
        marginTop: 2,

        fontSize: 16,
        fontWeight: '600',

        color: Colors.text,
    },

    arrow: {
        fontSize: 14,
        color: Colors.textSecondary,
    },
});