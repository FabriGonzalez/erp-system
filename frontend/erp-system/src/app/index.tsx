import { useAuthStore } from '@/stores/auth-store';
import { homeRoute } from '@/utils/home-route';
import { Redirect } from 'expo-router';

export default function Index() {
    const user = useAuthStore((state) => state.user);

    if (user) {
        return <Redirect href={homeRoute(user)} />;
    }

    return <Redirect href="/(auth)/login" />;
}
