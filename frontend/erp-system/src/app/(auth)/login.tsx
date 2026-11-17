import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { FormField } from '@/components/ui/FormField';
import { IconBadge } from '@/components/ui/IconBadge';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { login as loginService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { SharedStyles } from '@/styles/shared';
import { homeRoute } from '@/utils/home-route';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';


export default function LoginScreen() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    const login = useAuthStore((state) => state.login);

    async function handleLogin() {
        setErrorMsg(null);

        if (!username.trim() || !password.trim()) {
            setErrorMsg('Por favor completa todos los campos.');
            return;
        }

        setIsLoading(true);

        try {
            const response = await loginService(username.trim(), password);

            console.log('LOGIN RESPONSE OK');

            await login(response);

            console.log('AUTH STORE UPDATED');

            router.replace(homeRoute(useAuthStore.getState().user));

            console.log('ROUTER REPLACE CALLED');
        } catch (error: unknown) {
            // Los servicios ya devuelven el mensaje en español, también sin conexión.
            setErrorMsg(error instanceof Error ? error.message : 'Ocurrió un error inesperado.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Screen style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.brand}>
                    <IconBadge icon={{ ios: 'building.2.fill', android: 'store', web: 'store' }} size={64} />
                    <Text style={styles.eyebrow}>ERP System</Text>
                    <Text style={styles.title} accessibilityRole="header">Iniciar sesión</Text>
                </View>

                <View style={[SharedStyles.card, styles.form]}>
                    <FormField label="Usuario">
                        <AppInput
                            value={username}
                            onChangeText={(text) => {
                                setUsername(text);
                                setErrorMsg(null);
                            }}
                            autoCapitalize="none"
                            autoCorrect={false}
                            autoComplete="username"
                            returnKeyType="next"
                            editable={!isLoading}
                        />
                    </FormField>

                    <FormField label="Contraseña">
                        <AppInput
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                setErrorMsg(null);
                            }}
                            secureTextEntry
                            autoComplete="current-password"
                            editable={!isLoading}
                            autoCapitalize="none"
                            returnKeyType="done"
                            onSubmitEditing={handleLogin}
                        />
                    </FormField>

                    {errorMsg && (
                        <View style={styles.error} accessibilityRole="alert">
                            <Text style={styles.errorText}>{errorMsg}</Text>
                        </View>
                    )}

                    <AppButton
                        title={isLoading ? 'Ingresando...' : 'Ingresar'}
                        onPress={handleLogin}
                        disabled={isLoading}
                    />
                </View>

                <Text style={styles.footerText}>Pruebas demo ERP multi-tenant</Text>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: Colors.background,
    },
    scroll: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: Spacing.lg,
        gap: Spacing.xl,
    },
    brand: {
        alignItems: 'center',
        gap: Spacing.xs,
    },
    eyebrow: {
        marginTop: Spacing.sm,
        fontSize: 13,
        color: Colors.textSecondary,
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5,
        color: Colors.text,
    },
    form: {
        width: '100%',
        maxWidth: 420,
        alignSelf: 'center',
        gap: Spacing.lg,
        padding: Spacing.xl,
    },
    error: {
        backgroundColor: Colors.errorLight,
        borderRadius: Radius.sm,
        padding: Spacing.md,
    },
    errorText: {
        color: Colors.error,
        fontSize: 13,
        lineHeight: 18,
    },
    footerText: {
        textAlign: 'center',
        color: Colors.textSecondary,
        fontSize: 12,
    },
});
