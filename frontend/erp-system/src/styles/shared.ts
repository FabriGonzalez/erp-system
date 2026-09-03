import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { StyleSheet } from 'react-native';

export const SharedStyles = StyleSheet.create({
    pressed: {
        opacity: 0.7,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },

    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
    },

    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },

    headerSpacer: {
        width: 32,
    },

    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.xs + 2,
    },

    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#DCFCE7',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#BBF7D0',
    },

    successText: {
        color: '#166534',
        fontSize: 14,
        fontWeight: '600',
    },

    card: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        padding: Spacing.lg,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.md,
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.md,
        minHeight: 48,
        borderRadius: 12,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    searchInput: {
        flex: 1,
        justifyContent: 'center',
        marginLeft: Spacing.sm,
        minHeight: 46,
    },

    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    filterChipSelected: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },

    filterChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textSecondary,
    },

    filterChipTextSelected: {
        color: '#FFFFFF',
    },

    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: 12,
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FECACA',
    },

    errorTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.error,
    },

    errorMessage: {
        marginTop: 2,
        fontSize: 12,
        color: Colors.textSecondary,
    },

    retryButton: {
        marginLeft: Spacing.sm,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },

    retryText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },

    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: Spacing.md,
    },

    loadingText: {
        marginTop: Spacing.sm,
        fontSize: 14,
        color: Colors.textSecondary,
    },

    buttonPrimary: {
        flex: 1,
        minWidth: 100,
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
    },

    buttonPrimaryText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },

    buttonSecondary: {
        flex: 1,
        minWidth: 100,
        height: 44,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
    },

    buttonSecondaryText: {
        color: Colors.text,
        fontSize: 14,
        fontWeight: '600',
    },

    buttonDanger: {
        width: '100%',
        height: 44,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FEF2F2',
        borderWidth: 1,
        borderColor: '#FCA5A5',
    },

    buttonDangerText: {
        color: Colors.error,
        fontSize: 14,
        fontWeight: '600',
    },
});
