import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { Typography } from '@/constants/typography';
import { mockEmployee, mockUser } from '@/data/mock-user';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function LoginScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const login = useAuthStore((state) => state.login);
    const setActiveBranch = useBranchStore(
        (state) => state.setActiveBranch
    );

    function handleLogin() {
        setErrorMsg(null);

        // Validaciones básicas
        if (!email.trim() || !password.trim()) {
            setErrorMsg('Por favor completa todos los campos.');
            return;
        }

        setIsLoading(true);

        // Simulamos respuesta del servidor en 1 segundo
        setTimeout(() => {
            const normalizedEmail = email.trim().toLowerCase();

            if (normalizedEmail === 'admin@elyuyei.com' && password === 'admin') {
                login(mockUser);
                setActiveBranch(mockUser.branches[0]);
                setIsLoading(false);
                router.replace('/(app)/(tabs)');
            } else if (normalizedEmail === 'juan@elyuyei.com' && password === 'employee') {
                login(mockEmployee);
                setActiveBranch(mockEmployee.branches[0]);
                setIsLoading(false);
                router.replace('/(app)/(tabs)');
            } else {
                setIsLoading(false);
                setErrorMsg('Credenciales inválidas. Usa:\n• admin@elyuyei.com / admin\n• juan@elyuyei.com / employee');
            }
        }, 1000);
    }

    return (
        <Screen style={styles.container}>

            <View style={styles.form}>
                <View style={styles.header}>
                    <Text style={styles.title}>ERP System</Text>
                    <Text style={styles.subtitle}>Inicia sesión para continuar</Text>
                </View>
                <AppInput
                    placeholder="Email"
                    value={email}
                    onChangeText={(text) => {
                        setEmail(text);
                        setErrorMsg(null);
                    }}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!isLoading}
                />

                <AppInput
                    placeholder="Contraseña"
                    value={password}
                    onChangeText={(text) => {
                        setPassword(text);
                        setErrorMsg(null);
                    }}
                    secureTextEntry
                    editable={!isLoading}
                    autoCapitalize="none"
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                />

                {errorMsg && (
                    <View style={styles.errorContainer}>
                        <Text style={styles.errorText}>{errorMsg}</Text>
                    </View>
                )}

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={styles.loadingText}>Iniciando sesión...</Text>
                    </View>
                ) : (
                    <AppButton
                        title="Ingresar"
                        onPress={handleLogin}
                    />
                )}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Pruebas demo ERP multi-tenant
                    </Text>
                </View>
            </View>

        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        justifyContent: 'center',
        paddingHorizontal: Spacing.xl,
        backgroundColor: Colors.background,
    },

    header: {
        marginBottom: Spacing.xl,
    },

    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.text,
        textAlign: 'center',
    },

    subtitle: {
        marginTop: Spacing.sm,
        fontSize: Typography.body,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    form: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',

        gap: Spacing.md,
        backgroundColor: Colors.surface,
        padding: Spacing.xl,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: Colors.border,

        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    errorContainer: {
        backgroundColor: Colors.errorLight,
        borderWidth: 1,
        borderColor: Colors.errorBorder,
        borderRadius: 8,
        padding: Spacing.md,
    },

    errorText: {
        color: Colors.error,
        fontSize: 13,
        lineHeight: 18,
    },

    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        gap: Spacing.sm,
    },

    loadingText: {
        color: Colors.textSecondary,
        fontSize: 14,
    },

    footer: {
        marginTop: Spacing.xxl,
        alignItems: 'center',
    },

    footerText: {
        color: Colors.textSecondary,
        fontSize: 12,
    },
});
