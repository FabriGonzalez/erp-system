import Head from 'expo-router/head';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { useAuthStore } from '@/stores/auth-store';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const user = useAuthStore((state) => state.user);
  const hydrate = useAuthStore((state) => state.hydrate);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.title = 'ERP System';
    }
  }, [segments]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      router.replace('/(auth)/login');
      return;
    }

    if (user && inAuthGroup) {
      router.replace('/(app)/(tabs)/shipments');
    }
  }, [user, isHydrated, segments, router]);

  if (!isHydrated) {
    return null;
  }

  return (
    <>
      <Head>
        <title>ERP System</title>
      </Head>
      <StatusBar style="dark" />

      <Slot />
    </>
  );
}