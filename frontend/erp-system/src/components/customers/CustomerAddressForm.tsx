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
import {
    useCreateAddress,
    useCustomer,
    useCustomerAddresses,
    useUpdateAddress,
} from '@/hooks/use-customer-queries';
import { SharedStyles } from '@/styles/shared';
import { Customer, CustomerAddress } from '@/types/customer';
import {
    AddressDraft,
    addressToDraft,
    EMPTY_ADDRESS_DRAFT,
    toAddressRequest,
    validateAddressDraft,
} from '@/utils/address';

type CustomerAddressFormProps = {
    customerId: string;
    // Si se pasa, edita esa dirección; si no, agrega una nueva.
    addressId?: string;
    onAddressCreated?: (address: CustomerAddress) => void;
};

/** Alta o edición de una dirección. Carga los datos y monta el formulario ya inicializado. */
export function CustomerAddressForm({
    customerId,
    addressId,
    onAddressCreated,
}: CustomerAddressFormProps) {
    const isEdit = Boolean(addressId);
    const title = isEdit ? 'Editar dirección' : 'Agregar dirección';
    const { customer, notFound, isLoading } = useCustomer(customerId);
    const { addresses, isLoading: addressesLoading } = useCustomerAddresses(isEdit ? customerId : undefined);
    const address = isEdit ? addresses.find((item) => item.id === addressId) : undefined;

    if ((!customer && isLoading) || (isEdit && !address && addressesLoading)) {
        return (
            <Screen>
                <LoadingState label="Cargando..." />
            </Screen>
        );
    }

    if (!customer && notFound) {
        return (
            <NotFound
                headerTitle={title}
                title="Cliente no encontrado"
                description="No se pudo encontrar el cliente de esta dirección."
            />
        );
    }

    if (isEdit && !address) {
        return (
            <NotFound
                headerTitle={title}
                title="Dirección no encontrada"
                description="La dirección que querés editar no existe o ya no está disponible."
            />
        );
    }

    return (
        <AddressFormBody
            key={address?.id ?? 'new'}
            customerId={customerId}
            customer={customer}
            address={address}
            title={title}
            onAddressCreated={onAddressCreated}
        />
    );
}

type AddressFormBodyProps = {
    customerId: string;
    customer: Customer | null;
    address?: CustomerAddress;
    title: string;
    onAddressCreated?: (address: CustomerAddress) => void;
};

function AddressFormBody({ customerId, customer, address, title, onAddressCreated }: AddressFormBodyProps) {
    const createAddress = useCreateAddress(customerId);
    const updateAddress = useUpdateAddress(customerId);

    const [draft, setDraft] = useState<AddressDraft>(address ? addressToDraft(address) : EMPTY_ADDRESS_DRAFT);
    const [formError, setFormError] = useState<string | null>(null);
    const isSubmitting = createAddress.isPending || updateAddress.isPending;

    async function handleSave() {
        if (isSubmitting) {
            return;
        }

        const validationError = validateAddressDraft(draft);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setFormError(null);

        try {
            if (address) {
                // El PATCH reemplaza todos los campos. mainAddress=false no le quita el
                // rol de principal: eso solo cambia marcando otra.
                await updateAddress.mutateAsync({ addressId: address.id, data: toAddressRequest(draft) });
            } else {
                const created = await createAddress.mutateAsync(toAddressRequest(draft));
                onAddressCreated?.(created);
            }
            router.back();
        } catch (error: unknown) {
            setFormError(error instanceof Error ? error.message : 'No se pudo guardar la dirección.');
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
                        {title}
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
