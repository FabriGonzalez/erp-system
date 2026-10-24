import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PromotionForm } from '@/components/promotions/PromotionForm';
import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useSavePromotion } from '@/hooks/use-promotion-queries';
import { useAuthStore } from '@/stores/auth-store';
import { showToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
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
            <View style={[SharedStyles.topBar, SharedStyles.topBarElevated]}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={styles.screenTitle}>Nueva promo</Text>
            </View>

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
    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
        marginRight: Spacing.xs,
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
});
