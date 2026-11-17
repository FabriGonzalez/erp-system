import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { DialogOptionStyle, useDialogStore } from '@/stores/dialog-store';

/**
 * Diálogo de confirmación de toda la app; muestra de a uno los pedidos de chooseAction /
 * confirmAction. Con la sesión expirada no se muestra: ese aviso tiene que quedar arriba.
 */
export function DialogHost() {
    const request = useDialogStore((state) => state.queue[0]);
    const answer = useDialogStore((state) => state.answer);
    const sessionExpired = useAuthStore((state) => state.sessionExpired);

    if (!request || sessionExpired) {
        return null;
    }

    // Con dos opciones van lado a lado (Cancelar | Confirmar); con más, una debajo de otra.
    const stacked = request.options.length > 2;

    return (
        <Modal visible transparent animationType="fade" onRequestClose={() => answer(request.id, null)}>
            <View style={styles.overlay}>
                <View style={styles.card} accessibilityRole="alert">
                    <Text style={styles.title}>{request.title}</Text>
                    <Text style={styles.message}>{request.message}</Text>

                    <View style={[styles.actions, stacked && styles.actionsStacked]}>
                        {request.options.map((option) => (
                            <Pressable
                                key={option.label}
                                onPress={() => answer(request.id, option.value)}
                                style={({ pressed }) => [
                                    styles.button,
                                    !stacked && styles.buttonInline,
                                    buttonStyle(option.style),
                                    pressed && styles.pressed,
                                ]}
                            >
                                <Text style={[styles.buttonText, buttonTextStyle(option.style)]}>
                                    {option.label}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

function buttonStyle(style: DialogOptionStyle = 'default') {
    switch (style) {
        case 'cancel':
            return styles.buttonCancel;
        case 'destructive':
            return styles.buttonDestructive;
        default:
            return styles.buttonDefault;
    }
}

function buttonTextStyle(style: DialogOptionStyle = 'default') {
    return style === 'cancel' ? styles.buttonTextCancel : styles.buttonTextFilled;
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: Spacing.lg,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        padding: Spacing.lg,
        gap: Spacing.sm,
        boxShadow: '0 16px 40px -16px rgba(15, 23, 42, 0.45)',
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
        color: Colors.text,
    },
    message: {
        fontSize: 15,
        lineHeight: 21,
        color: Colors.textSecondary,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    actionsStacked: {
        flexDirection: 'column-reverse',
    },
    button: {
        minHeight: 50,
        paddingHorizontal: Spacing.md,
        borderRadius: Radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonInline: {
        flex: 1,
    },
    buttonDefault: {
        backgroundColor: Colors.primary,
    },
    buttonDestructive: {
        backgroundColor: Colors.error,
    },
    buttonCancel: {
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '700',
    },
    buttonTextFilled: {
        color: Colors.white,
    },
    buttonTextCancel: {
        color: Colors.text,
    },
    pressed: {
        opacity: 0.85,
    },
});
