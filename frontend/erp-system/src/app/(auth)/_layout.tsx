import { useEffect } from 'react';

import {
    Slot,
    useRouter,
    useSegments,
} from 'expo-router';

import { useAuthStore } from '@/stores/auth-store';

export default function RootLayout() {
    const user = useAuthStore((state) => state.user);

    const router = useRouter();

    const segments = useSegments();

    useEffect(() => {
        const inAuthGroup = segments[0] === '(auth)';

        if (!user && !inAuthGroup) {
            router.replace('/(auth)/login');
        }

        if (user && inAuthGroup) {
            router.replace({
                pathname: '/(app)/(tabs)',
            });
        }
    }, [user, segments]);

    return <Slot />;
}