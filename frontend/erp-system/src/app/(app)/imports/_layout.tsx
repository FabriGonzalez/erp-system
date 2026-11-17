import { Stack } from 'expo-router';

// Al recargar (F5) o entrar por link, la flecha vuelve a esta pantalla.
export const unstable_settings = { anchor: 'index' };

export default function ImportsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        />
    );
}
