import { StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { getInitials } from '@/utils/format';

export function AppHeader() {
    const user = useAuthStore((state) => state.user);

    const activeBranch = useBranchStore(
        (state) => state.activeBranch
    );

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

            <Avatar
                initials={user?.name ? getInitials(user.name) : 'U'}
                size={38}
                fontWeight="600"
                fontSize={14}
                backgroundColor={Colors.primary}
                textColor={Colors.white}
                style={styles.avatar}
            />
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
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
});