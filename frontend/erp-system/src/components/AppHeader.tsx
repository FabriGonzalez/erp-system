import { StyleSheet, Text, View } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

export function AppHeader() {
    const user = useAuthStore((state) => state.user);

    const activeBranch = useBranchStore(
        (state) => state.activeBranch
    );

    const initials = user?.name
        ? user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()
        : 'U';

    return (
        <View style={styles.container}>
            <View>
                <Text style={styles.company}>
                    {user?.company.name ?? 'ERP System'}
                </Text>

                {activeBranch && (
                    <Text style={styles.branch}>
                        📍 {activeBranch.name}
                    </Text>
                )}
            </View>

            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
    },

    company: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },

    branch: {
        marginTop: 2,
        fontSize: 12,
        fontWeight: '500',
        color: Colors.textSecondary,
    },

    avatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },

    avatarText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
});