import Head from 'expo-router/head';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { QueryClientProvider } from '@tanstack/react-query';

import { queryClient } from '@/services/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { useDialogStore } from '@/stores/dialog-store';
import { useToastStore } from '@/stores/toast-store';
import { SessionExpiredOverlay } from '@/components/SessionExpiredOverlay';
import { DialogHost } from '@/components/ui/DialogHost';
import { ToastHost } from '@/components/ui/ToastHost';
import { homeRoute } from '@/utils/home-route';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  const user = useAuthStore((state) => state.user);
  const sessionExpired = useAuthStore((state) => state.sessionExpired);
  const hydrate = useAuthStore((state) => state.hydrate);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Avisos y confirmaciones son de la sesión: al entrar, salir o expirar no quedan colgados
  // (una confirmación pendiente se resuelve como cancelada).
  useEffect(() => {
    useToastStore.getState().clear();
    useDialogStore.getState().dismissAll();
  }, [user?.id, sessionExpired]);

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

    if (!user && !inAuthGroup && !sessionExpired) {
      router.replace('/(auth)/login');
      return;
    }

    if (user && inAuthGroup && !sessionExpired) {
      router.replace(homeRoute(user));
    }
  }, [user, isHydrated, segments, router, sessionExpired]);

  if (!isHydrated) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Head>
        <title>ERP System</title>
      </Head>
      <StatusBar style="dark" />

      <Slot />
      <ToastHost />
      <DialogHost />
      {/* Último: el aviso de sesión expirada queda por encima de todo. */}
      <SessionExpiredOverlay key={sessionExpired ? 'expired' : 'active'} />
    </QueryClientProvider>
  );
}