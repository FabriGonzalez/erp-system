import { useAuthStore } from '@/stores/auth-store';
import { Redirect } from 'expo-router';

export default function Index() {
    const user = useAuthStore((state) => state.user);

    if (user) {
        return <Redirect href="/(app)/(tabs)/orders" />;
    }

    return <Redirect href="/(auth)/login" />;
}
