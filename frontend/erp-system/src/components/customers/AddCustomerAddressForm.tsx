import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { AddressFields } from '@/components/customers/AddressFields';
import { LoadingState } from '@/components/ui/LoadingState';
import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCustomer } from '@/hooks/use-customer';
import { createAddress, getCustomer } from '@/services/customer-service';
import { useAuthStore } from '@/stores/auth-store';
import { useCustomerStore } from '@/stores/customer-store';
import { SharedStyles } from '@/styles/shared';
import { CustomerAddress } from '@/types/customer';
import {
    AddressDraft,
    EMPTY_ADDRESS_DRAFT,
    toAddressRequest,
    validateAddressDraft,
} from '@/utils/address';

type AddCustomerAddressFormProps = {
    customerId: string;
    onAddressCreated?: (address: CustomerAddress) => void;
};

export function AddCustomerAddressForm({
    customerId,
    onAddressCreated,
}: AddCustomerAddressFormProps) {
    const token = useAuthStore((state) => state.token);
    const customersChanged = useCustomerStore((state) => state.customersChanged);
    const { customer, notFound, isLoading } = useCustomer(customerId);

    const [draft, setDraft] = useState<AddressDraft>(EMPTY_ADDRESS_DRAFT);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!customer && isLoading) {
        return (
            <Screen>
                <LoadingState label="Cargando cliente..." />
            </Screen>
        );
    }

    if (!customer && notFound) {
        return (
            <NotFound
                headerTitle="Agregar dirección"
                title="Cliente no encontrado"
                description="No se pudo encontrar el cliente al que querés agregar la dirección."
            />
        );
    }

    async function handleSave() {
        if (isSubmitting) {
            return;
        }

        const validationError = validateAddressDraft(draft);
        if (validationError) {
            setFormError(validationError);
            return;
        }
        if (!token) {
            setFormError('No hay sesión activa.');
            return;
        }

        setFormError(null);
        setIsSubmitting(true);

        try {
            const address = await createAddress(customerId, toAddressRequest(draft), token);

            // El cliente cambió (cantidad de direcciones, quizá la principal): se publica
            // la versión del backend para el borrador de orden y los listados abiertos.
            const updatedCustomer = await getCustomer(customerId, token).catch(() => undefined);
            customersChanged(updatedCustomer);

            onAddressCreated?.(address);
            router.back();
        } catch (error: unknown) {
            setFormError(error instanceof Error ? error.message : 'No se pudo agregar la dirección.');
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleCancel() {
        if (!isSubmitting) {
            router.back();
        }
    }

    return (
        <Screen style={styles.screen}>
            <View style={[SharedStyles.header, styles.header]}>
                <Pressable
                    onPress={handleCancel}
                    style={({ pressed }) => [
                        SharedStyles.backButton,
                        pressed && SharedStyles.pressed,
                    ]}
                >
                    <SymbolView
                        name={{
                            ios: 'chevron.left',
                            android: 'arrow_back',
                            web: 'arrow_back',
                        }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>

                <View style={styles.headerText}>
                    <Text style={SharedStyles.headerTitle}>
                        Agregar dirección
                    </Text>

                    {customer ? (
                        <Text style={styles.headerSubtitle}>
                            {customer.name}
                        </Text>
                    ) : null}
                </View>

                <View style={SharedStyles.headerSpacer} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={SharedStyles.listContent}
            >
                <View style={SharedStyles.card}>
                    <Text style={[SharedStyles.cardTitle, styles.sectionTitle]}>
                        Datos de la dirección
                    </Text>

                    <AddressFields
                        value={draft}
                        onChange={(next) => {
                            setDraft(next);
                            setFormError(null);
                        }}
                        editable={!isSubmitting}
                    />

                    {formError ? (
                        <View style={styles.errorBox}>
                            <SymbolView
                                name={{
                                    ios: 'exclamationmark.circle',
                                    android: 'error',
                                    web: 'error',
                                }}
                                size={18}
                                tintColor={Colors.error}
                            />

                            <Text style={styles.errorText}>
                                {formError}
                            </Text>
                        </View>
                    ) : null}
                </View>

                <View style={styles.actions}>
                    <Pressable
                        onPress={handleCancel}
                        disabled={isSubmitting}
                        style={({ pressed }) => [
                            SharedStyles.buttonSecondary,
                            pressed && SharedStyles.pressed,
                        ]}
                    >
                        <Text style={SharedStyles.buttonSecondaryText}>
                            Cancelar
                        </Text>
                    </Pressable>

                    <Pressable
                        onPress={handleSave}
                        disabled={isSubmitting}
                        style={({ pressed }) => [
                            SharedStyles.buttonPrimary,
                            (pressed || isSubmitting) && SharedStyles.pressed,
                        ]}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                            <Text style={SharedStyles.buttonPrimaryText}>
                                Guardar dirección
                            </Text>
                        )}
                    </Pressable>
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    header: {
        paddingHorizontal: Spacing.lg,
    },
    headerText: {
        flex: 1,
        marginLeft: Spacing.sm,
    },
    headerSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    sectionTitle: {
        marginBottom: Spacing.lg,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        padding: Spacing.md,
        borderRadius: 10,
        backgroundColor: Colors.errorLight,
        borderWidth: 1,
        borderColor: '#FECACA',
        marginTop: Spacing.xs,
    },
    errorText: {
        flex: 1,
        fontSize: 13,
        color: Colors.error,
    },
    actions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.lg,
    },
});
