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
import { useAuthStore } from '@/stores/auth-store';

const REDIRECT_DELAY_SECONDS = 5;

export function SessionExpiredOverlay() {
    const sessionExpired = useAuthStore((state) => state.sessionExpired);
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
        if (!sessionExpired) {
            isFinishingRef.current = false;
            return;
        }

        const timer = setInterval(() => {
            setSecondsRemaining((current) => {
                if (current <= 1) {
                    return 0;
                }
                return current - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [sessionExpired]);

    useEffect(() => {
        if (sessionExpired && secondsRemaining === 0) {
            void finishLogout();
        }
    }, [finishLogout, secondsRemaining, sessionExpired]);

    if (!sessionExpired) {
        return null;
    }

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
                    <Text style={styles.title}>Sesión expirada</Text>
                    <Text style={styles.message}>
                        Tu sesión ha expirado. Serás redirigido al inicio de
                        sesión en {secondsRemaining} segundos.
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
