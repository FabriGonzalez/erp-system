import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { router } from 'expo-router';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SessionEndReason, useAuthStore } from '@/stores/auth-store';

const REDIRECT_DELAY_SECONDS = 5;

const TITLES: Record<SessionEndReason, string> = {
    expired: 'Sesión expirada',
    company_suspended: 'Empresa suspendida',
    company_cancelled: 'Empresa dada de baja',
};

const DESCRIPTIONS: Record<SessionEndReason, string> = {
    expired: 'Tu sesión ha expirado.',
    company_suspended:
        'El acceso de tu empresa está suspendido. Contactá al soporte para regularizarlo.',
    company_cancelled: 'La cuenta de tu empresa fue dada de baja.',
};

export function SessionExpiredOverlay() {
    const sessionExpired = useAuthStore((state) => state.sessionExpired);

    // El contenido se monta solo mientras la sesión está expirada: así cada
    // expiración arranca con el contador y el guard de logout en su estado inicial.
    return sessionExpired ? <SessionExpiredModal /> : null;
}

function SessionExpiredModal() {
    const sessionEndReason = useAuthStore((state) => state.sessionEndReason);
    const logout = useAuthStore((state) => state.logout);
    const [secondsRemaining, setSecondsRemaining] = useState(
        REDIRECT_DELAY_SECONDS
    );
    const isFinishingRef = useRef(false);

    const finishLogout = useCallback(async () => {
        if (isFinishingRef.current) {
            return;
        }

        isFinishingRef.current = true;
        await logout();
        router.replace('/(auth)/login');
    }, [logout]);

    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsRemaining((current) => {
                if (current <= 1) {
                    return 0;
                }
                return current - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (secondsRemaining === 0) {
            void finishLogout();
        }
    }, [finishLogout, secondsRemaining]);

    return (
        <Modal
            visible
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={() => {
                void finishLogout();
            }}
        >
            <View style={styles.backdrop}>
                <View style={styles.container}>
                    <Text style={styles.title}>{TITLES[sessionEndReason]}</Text>
                    <Text style={styles.message}>
                        {DESCRIPTIONS[sessionEndReason]} Serás redirigido al
                        inicio de sesión en {secondsRemaining} segundos.
                    </Text>
                    <Text style={styles.counter}>{secondsRemaining}</Text>
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                            void finishLogout();
                        }}
                        style={({ pressed }) => [
                            styles.button,
                            pressed && styles.buttonPressed,
                        ]}
                    >
                        <Text style={styles.buttonText}>Cerrar sesión</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: Spacing.xl,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
    },
    container: {
        width: '100%',
        maxWidth: 420,
        alignItems: 'center',
        padding: Spacing.xl,
        borderRadius: 16,
        backgroundColor: Colors.surface,
    },
    title: {
        color: Colors.text,
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
    },
    message: {
        marginTop: Spacing.md,
        color: Colors.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
    },
    counter: {
        marginVertical: Spacing.lg,
        color: Colors.primary,
        fontSize: 40,
        fontWeight: '700',
    },
    button: {
        minWidth: 180,
        alignItems: 'center',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        borderRadius: 8,
        backgroundColor: Colors.primary,
    },
    buttonPressed: {
        opacity: 0.8,
    },
    buttonText: {
        color: Colors.white,
        fontSize: 15,
        fontWeight: '600',
    },
});
