import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/AppHeader';
import { Colors } from '@/constants/colors';
import { useActiveBranchSync } from '@/hooks/use-branch-queries';
import { useAuthStore } from '@/stores/auth-store';

// Al recargar (F5) o entrar por link a una pantalla fuera de las pestañas, las pestañas quedan
// debajo: la flecha vuelve a ellas en lugar de quedar sin historial.
export const unstable_settings = { anchor: '(tabs)' };

export default function AppLayout() {
    // Sucursales disponibles y sucursal activa: las relee TanStack al volver al frente.
    useActiveBranchSync();

    // Al volver al frente se releen rol y permisos: un admin pudo cambiarlos mientras tanto.
    useEffect(() => {
        const subscription = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
                void useAuthStore.getState().refreshUser();
            }
        });
        return () => subscription.remove();
    }, []);

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader />

            <View style={styles.content}>
                <Stack screenOptions={{ headerShown: false }} />
            </View>
        </SafeAreaView>
    );
}


const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
    },
});