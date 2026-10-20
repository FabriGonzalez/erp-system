import { SymbolView, SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { ToastType, useToastStore } from '@/stores/toast-store';

const PALETTE: Record<ToastType, { accent: string; background: string; icon: SymbolViewProps['name'] }> = {
    success: {
        accent: Colors.success,
        background: Colors.successSoft,
        icon: { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' },
    },
    error: {
        accent: Colors.error,
        background: Colors.errorLight,
        icon: { ios: 'exclamationmark.circle.fill', android: 'error', web: 'error' },
    },
    info: {
        accent: Colors.primary,
        background: Colors.primaryLight,
        icon: { ios: 'info.circle.fill', android: 'info', web: 'info' },
    },
};

/**
 * Avisos de toda la app, arriba y sobre el contenido. Se monta una vez en el layout raíz; no
 * bloquea la pantalla (solo los avisos reciben toques: tocarlos los cierra).
 */
export function ToastHost() {
    const toasts = useToastStore((state) => state.toasts);
    const dismiss = useToastStore((state) => state.dismiss);
    const insets = useSafeAreaInsets();

    return (
        <View style={[styles.container, { top: insets.top + Spacing.sm }]}>
            {toasts.map((toast) => {
                const palette = PALETTE[toast.type];
                return (
                    <Animated.View
                        key={toast.id}
                        entering={FadeInUp.duration(200)}
                        exiting={FadeOutUp.duration(150)}
                        layout={LinearTransition.duration(150)}
                        style={styles.item}
                    >
                        <Pressable
                            onPress={() => dismiss(toast.id)}
                            accessibilityRole="alert"
                            accessibilityHint="Tocá para cerrar"
                            style={({ pressed }) => [
                                styles.toast,
                                { backgroundColor: palette.background, borderLeftColor: palette.accent },
                                pressed && styles.pressed,
                            ]}
                        >
                            <SymbolView name={palette.icon} size={20} tintColor={palette.accent} />
                            <Text style={styles.message}>{toast.message}</Text>
                        </Pressable>
                    </Animated.View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        gap: Spacing.sm,
        zIndex: 1000,
        elevation: 1000,
        // Los toques que no caen sobre un aviso pasan a la pantalla de abajo.
        pointerEvents: 'box-none',
    },
    item: {
        width: '100%',
        maxWidth: 480,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.md,
        borderRadius: 12,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 6,
    },
    pressed: {
        opacity: 0.85,
    },
    message: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        color: Colors.text,
    },
});
