import { Stack } from 'expo-router';

// Al recargar (F5) o entrar por link, el listado queda debajo y la flecha vuelve a él.
export const unstable_settings = { anchor: 'index' };

export default function TransfersLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        />
    );
}
