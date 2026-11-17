import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { PromotionForm } from '@/components/promotions/PromotionForm';
import { NotFound } from '@/components/ui/NotFound';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { useSavePromotion } from '@/hooks/use-promotion-queries';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/stores/toast-store';
import { PromotionRequest } from '@/types/promotion';
import { hasPermission } from '@/utils/permissions';

export default function NewPromotionScreen() {
    const canManage = useAuthStore((state) => hasPermission(state.user, 'ADMINISTRAR_PRECIOS'));
    const savePromotion = useSavePromotion();
    const [submitError, setSubmitError] = useState<string | null>(null);

    async function handleSubmit(data: PromotionRequest) {
        setSubmitError(null);
        try {
            const promotion = await savePromotion.mutateAsync({ data });
            showToast({ type: 'success', message: `Promo "${promotion.name}" creada.` });
            router.back();
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'No se pudo crear la promo.');
        }
    }

    if (!canManage) {
        return (
            <NotFound
                headerTitle="Nueva promo"
                title="Sin permisos"
                description='Crear promos requiere el permiso "Administrar precios".'
            />
        );
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader onBack={() => router.back()} eyebrow="Promociones" title="Nueva promo" />

            <PromotionForm
                onSubmit={(data) => void handleSubmit(data)}
                isSubmitting={savePromotion.isPending}
                submitLabel="Crear promo"
                submitError={submitError}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
});
