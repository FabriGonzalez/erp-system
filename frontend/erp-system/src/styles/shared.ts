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

    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },

    rowCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.sm,
    },

    topBarElevated: {
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },

    screenTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: Colors.text,
    },

    screenSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textSecondary,
        marginTop: 2,
    },

    listContent: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
    },

    listEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
    },

    content: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
    },

    filterListContent: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.xs + 2,
        alignItems: 'center',
    },

    filterDivider: {
        width: 1,
        height: 20,
        backgroundColor: Colors.border,
        marginHorizontal: Spacing.sm,
    },

    successBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.successLight,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        gap: Spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: Colors.successBorder,
    },

    successText: {
        color: Colors.successDark,
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
        marginHorizontal: Spacing.lg,
        marginTop: Spacing.sm,
        paddingHorizontal: Spacing.md,
        height: 44,
        borderRadius: 10,
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },

    searchInput: {
        flex: 1,
        marginLeft: Spacing.sm,
        height: '100%',
        borderWidth: 0,
        backgroundColor: 'transparent',
        paddingHorizontal: 0,
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
        color: Colors.white,
    },

    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: Spacing.md,
        marginTop: Spacing.md,
        padding: Spacing.md,
        borderRadius: 12,
        backgroundColor: Colors.errorLight,
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
        color: Colors.white,
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
        backgroundColor: Colors.errorLight,
        borderWidth: 1,
        borderColor: Colors.errorBorder,
    },

    buttonDangerText: {
        color: Colors.error,
        fontSize: 14,
        fontWeight: '600',
    },

    addButton: {
        minHeight: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: 10,
        gap: 8,
    },

    addIconContainer: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 5,
    },


    addButtonText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '700',
    },

    buttonSubmit: {
        height: 50,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.primary,
    },

    buttonSubmitText: {
        color: Colors.white,
        fontSize: 16,
        fontWeight: '600',
    },

    buttonCancel: {
        height: 48,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },

    buttonCancelText: {
        color: Colors.textSecondary,
        fontSize: 15,
        fontWeight: '500',
    },
});
