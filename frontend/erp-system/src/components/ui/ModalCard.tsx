import { SymbolView } from 'expo-symbols';
import { ReactNode } from 'react';
import {
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

import { FormFooter } from './FormFooter';

type ModalCardProps = {
    visible?: boolean;
    title: string;
    /** Debajo del título: de qué es (el atributo de un valor, la sucursal). */
    subtitle?: string;
    onClose: () => void;
    /** Mientras se guarda no se puede cerrar. */
    closeDisabled?: boolean;
    /** Error del modal: en el celular el Modal tapa los toasts. */
    error?: string | null;
    /** Botones al pie, mismo ancho (Cancelar | Guardar). */
    footer?: ReactNode;
    /**
     * Sin scroll propio: para un contenido que ya tiene su lista (FlatList), que no puede ir
     * dentro de un ScrollView.
     */
    scroll?: boolean;
    /** iOS: el modal terminó de cerrarse; recién ahí se puede abrir otro. */
    onDismiss?: () => void;
    children: ReactNode;
};

/**
 * Diálogo centrado de la app: título con cerrar, contenido con scroll y botones al pie. Con el
 * teclado abierto se achica a lo que queda visible (los Modal no pasan por Screen).
 */
export function ModalCard({
    visible = true,
    title,
    subtitle,
    onClose,
    closeDisabled = false,
    error,
    footer,
    scroll = true,
    onDismiss,
    children,
}: ModalCardProps) {
    const errorBanner = error ? (
        <View style={styles.error} accessibilityRole="alert">
            <Text style={styles.errorText}>{error}</Text>
        </View>
    ) : null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={closeDisabled ? () => undefined : onClose}
            onDismiss={onDismiss}
        >
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'web' ? undefined : 'padding'}
            >
                <View style={styles.card}>
                    <View style={styles.header}>
                        <View style={styles.titles}>
                            <Text style={styles.title} accessibilityRole="header">{title}</Text>
                            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
                        </View>
                        <Pressable
                            onPress={onClose}
                            disabled={closeDisabled}
                            accessibilityRole="button"
                            accessibilityLabel="Cerrar"
                            hitSlop={8}
                            style={({ pressed }) => [
                                styles.close,
                                (pressed || closeDisabled) && SharedStyles.pressed,
                            ]}
                        >
                            <SymbolView
                                name={{ ios: 'xmark', android: 'close', web: 'close' }}
                                size={18}
                                tintColor={Colors.textSecondary}
                            />
                        </Pressable>
                    </View>

                    {scroll ? (
                        <ScrollView
                            style={styles.shrink}
                            contentContainerStyle={styles.body}
                            keyboardShouldPersistTaps="handled"
                        >
                            {errorBanner}
                            {children}
                        </ScrollView>
                    ) : (
                        <View style={[styles.shrink, styles.body]}>
                            {errorBanner}
                            {children}
                        </View>
                    )}

                    {footer ? <FormFooter>{footer}</FormFooter> : null}
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
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
        maxWidth: 460,
        maxHeight: '90%',
        backgroundColor: Colors.surface,
        borderRadius: Radius.xl,
        overflow: 'hidden',
        boxShadow: '0 16px 40px -16px rgba(15, 23, 42, 0.45)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.md,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        paddingBottom: Spacing.sm,
    },
    titles: {
        flex: 1,
        gap: 2,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.3,
        color: Colors.text,
    },
    subtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    close: {
        width: 32,
        height: 32,
        borderRadius: Radius.pill,
        backgroundColor: Colors.muted,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shrink: {
        flexShrink: 1,
    },
    body: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.lg,
        gap: Spacing.lg,
    },
    error: {
        backgroundColor: Colors.errorLight,
        borderRadius: Radius.sm,
        padding: Spacing.md,
    },
    errorText: {
        fontSize: 13,
        color: Colors.error,
    },
});
