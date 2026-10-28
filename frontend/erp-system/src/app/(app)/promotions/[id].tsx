import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { PromotionForm } from '@/components/promotions/PromotionForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { HeaderButton } from '@/components/ui/HeaderButton';
import { LoadingState } from '@/components/ui/LoadingState';
import { NotFound } from '@/components/ui/NotFound';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { usePromotion, useSavePromotion, useSetPromotionActive } from '@/hooks/use-promotion-queries';
import { useAuthStore } from '@/stores/auth-store';
import { showErrorToast, showToast } from '@/stores/toast-store';
import { PROMOTION_STATUS_LABELS, PromotionRequest } from '@/types/promotion';
import { confirmAction } from '@/utils/confirm';
import { hasPermission } from '@/utils/permissions';

/** Edición de una promo. Los pedidos ya hechos guardan una copia y no cambian. */
export default function EditPromotionScreen() {
    const canManage = useAuthStore((state) => hasPermission(state.user, 'ADMINISTRAR_PRECIOS'));
    const { id } = useLocalSearchParams<{ id: string }>();
    const { promotion, isLoading, loadError } = usePromotion(canManage ? id : undefined, { fresh: true });
    const savePromotion = useSavePromotion();
    const setActive = useSetPromotionActive();
    const [submitError, setSubmitError] = useState<string | null>(null);

    async function handleSubmit(data: PromotionRequest) {
        if (!promotion) return;
        setSubmitError(null);
        try {
            await savePromotion.mutateAsync({ id: promotion.id, data });
            showToast({ type: 'success', message: 'Promo guardada.' });
            router.back();
        } catch (error) {
            setSubmitError(error instanceof Error ? error.message : 'No se pudo guardar la promo.');
        }
    }

    async function handleToggleActive() {
        if (!promotion) return;
        const activate = !promotion.active;
        const confirmed = await confirmAction({
            title: activate ? 'Activar promo' : 'Desactivar promo',
            message: activate
                ? 'Se va a poder vender mientras esté dentro de sus fechas.'
                : 'Deja de poder venderse. Los pedidos que ya la tienen no cambian.',
            confirmLabel: activate ? 'Activar' : 'Desactivar',
            destructive: !activate,
        });
        if (!confirmed) return;

        try {
            await setActive.mutateAsync({ id: promotion.id, active: activate });
            showToast({ type: 'success', message: activate ? 'Promo activada.' : 'Promo desactivada.' });
        } catch (error) {
            showErrorToast(error, 'No se pudo cambiar el estado de la promo.');
        }
    }

    if (!canManage) {
        return (
            <NotFound
                headerTitle="Promo"
                title="Sin permisos"
                description='Editar promos requiere el permiso "Administrar precios".'
            />
        );
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={() => router.back()}
                eyebrow={promotion ? `Promo · ${PROMOTION_STATUS_LABELS[promotion.status]}` : 'Promo'}
                title={promotion?.name ?? 'Promo'}
                right={promotion ? (
                    <HeaderButton
                        label={promotion.active ? 'Desactivar' : 'Activar'}
                        icon={null}
                        variant="secondary"
                        disabled={setActive.isPending}
                        onPress={() => void handleToggleActive()}
                    />
                ) : undefined}
            />

            {promotion ? (
                <PromotionForm
                    // Se inicializa una vez por promo.
                    key={promotion.id}
                    initialPromotion={promotion}
                    onSubmit={(data) => void handleSubmit(data)}
                    isSubmitting={savePromotion.isPending}
                    submitLabel="Guardar cambios"
                    submitError={submitError}
                />
            ) : isLoading ? (
                <LoadingState label="Cargando promo..." />
            ) : (
                <EmptyState
                    title="Promo no encontrada"
                    description={loadError ?? 'La promo no existe o es de otra empresa.'}
                    actionLabel="Volver"
                    onAction={() => router.back()}
                />
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
});
