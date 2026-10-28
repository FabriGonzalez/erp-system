import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { AddressFields } from '@/components/customers/AddressFields';
import { AddressSummary } from '@/components/customers/AddressSummary';
import { AppButton } from '@/components/ui/AppButton';
import { AppInput } from '@/components/ui/AppInput';
import { FilterChip } from '@/components/ui/FilterChip';
import { FormField } from '@/components/ui/FormField';
import { FormFooter } from '@/components/ui/FormFooter';
import { FormSection } from '@/components/ui/FormSection';
import { IconBadge } from '@/components/ui/IconBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/use-customer-queries';
import { SharedStyles } from '@/styles/shared';
import { Customer, CustomerRequest, DOCUMENT_TYPES } from '@/types/customer';
import {
    AddressDraft,
    EMPTY_ADDRESS_DRAFT,
    draftToDisplayAddress,
    toAddressRequest,
    validateAddressDraft,
} from '@/utils/address';

type CustomerFormProps = {
    // Si se pasa, el formulario edita ese cliente; si no, da de alta uno nuevo.
    customer?: Customer;
    onCustomerCreated?: (customer: Customer) => void;
};

// Validación liviana: el backend valida el formato completo.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Para estos tipos se guardan solo los dígitos: "20-12345678-3" y "20123456783" son
// el mismo documento y así el backend detecta el duplicado.
const NUMERIC_DOCUMENTS: Record<string, { min: number; max: number }> = {
    DNI: { min: 7, max: 8 },
    CUIT: { min: 11, max: 11 },
    CUIL: { min: 11, max: 11 },
};

function normalizeDocumentNumber(type: string, value: string): string {
    return NUMERIC_DOCUMENTS[type] ? value.replace(/\D/g, '') : value.trim();
}

export function CustomerForm({
    customer,
    onCustomerCreated,
}: CustomerFormProps) {
    const isEdit = Boolean(customer);
    const createCustomer = useCreateCustomer();
    const updateCustomer = useUpdateCustomer(customer?.id ?? '');

    const [firstName, setFirstName] = useState(customer?.firstName ?? '');
    const [lastName, setLastName] = useState(customer?.lastName ?? '');
    const [email, setEmail] = useState(customer?.email ?? '');
    const [phone, setPhone] = useState(customer?.phone ?? '');
    const [documentType, setDocumentType] = useState(customer?.documentType ?? '');
    const [documentNumber, setDocumentNumber] = useState(customer?.documentNumber ?? '');
    const [observations, setObservations] = useState(customer?.observations ?? '');

    const [addresses, setAddresses] = useState<AddressDraft[]>([]);
    const [showAddressForm, setShowAddressForm] = useState(false);
    const [addressDraft, setAddressDraft] = useState<AddressDraft>(EMPTY_ADDRESS_DRAFT);
    const [addrError, setAddrError] = useState('');

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [submitError, setSubmitError] = useState<string | null>(null);
    const isSubmitting = createCustomer.isPending || updateCustomer.isPending;

    function handleAddAddress() {
        const validationError = validateAddressDraft(addressDraft);
        if (validationError) {
            setAddrError(validationError);
            return;
        }

        setAddresses((currentAddresses) => [...currentAddresses, addressDraft]);
        setAddressDraft(EMPTY_ADDRESS_DRAFT);
        setAddrError('');
        setShowAddressForm(false);
    }

    function handleRemoveAddress(index: number) {
        setAddresses((currentAddresses) =>
            currentAddresses.filter(
                (_, currentIndex) => currentIndex !== index,
            ),
        );
    }

    function validate(): boolean {
        const newErrors: Record<string, string> = {};

        if (!firstName.trim() && !lastName.trim()) {
            newErrors.name = 'Ingresá el nombre o el apellido del cliente.';
        }
        if (email.trim() && !EMAIL_PATTERN.test(email.trim())) {
            newErrors.email = 'El email no es válido.';
        }

        // El backend exige tipo y número juntos.
        const normalizedDocument = normalizeDocumentNumber(documentType, documentNumber);
        if (documentType && !normalizedDocument) {
            newErrors.document = 'Ingresá el número de documento.';
        } else if (!documentType && documentNumber.trim()) {
            newErrors.document = 'Elegí el tipo de documento.';
        } else if (NUMERIC_DOCUMENTS[documentType]) {
            const { min, max } = NUMERIC_DOCUMENTS[documentType];
            if (normalizedDocument.length < min || normalizedDocument.length > max) {
                newErrors.document = min === max
                    ? `El ${documentType} debe tener ${min} dígitos.`
                    : `El ${documentType} debe tener entre ${min} y ${max} dígitos.`;
            }
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    }

    async function handleSubmit() {
        if (isSubmitting || !validate()) {
            return;
        }

        setSubmitError(null);

        // El PATCH reemplaza todos los campos: se manda siempre el objeto completo.
        const data: CustomerRequest = {
            firstName: firstName.trim() || null,
            lastName: lastName.trim() || null,
            email: email.trim() || null,
            phone: phone.trim() || null,
            documentType: documentType || null,
            documentNumber: documentType ? normalizeDocumentNumber(documentType, documentNumber) : null,
            observations: observations.trim() || null,
        };

        try {
            if (customer) {
                await updateCustomer.mutateAsync(data);
            } else {
                // Cliente y direcciones en una sola request: si algo falla, no queda nada a medias.
                const newCustomer = await createCustomer.mutateAsync({
                    ...data,
                    addresses: addresses.map((address) => toAddressRequest(address)),
                });
                onCustomerCreated?.(newCustomer);
            }
            router.back();
        } catch (error: unknown) {
            setSubmitError(
                error instanceof Error
                    ? error.message
                    : isEdit ? 'No se pudo guardar el cliente.' : 'No se pudo crear el cliente.'
            );
        }
    }

    function handleCancel() {
        if (isSubmitting) {
            return;
        }

        router.back();
    }

    function clearError(field: string) {
        if (errors[field]) {
            setErrors((currentErrors) => ({ ...currentErrors, [field]: '' }));
        }
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader
                onBack={isSubmitting ? undefined : handleCancel}
                eyebrow="Clientes"
                title={isEdit ? 'Editar cliente' : 'Nuevo cliente'}
            />

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={SharedStyles.pageContent}
                keyboardShouldPersistTaps="handled"
            >
                <FormSection title="Datos">
                    <View style={styles.nameBlock}>
                        <View style={styles.row}>
                            <FormField label="Nombre" style={styles.flex1}>
                                <AppInput
                                    placeholder="Ej. María"
                                    value={firstName}
                                    onChangeText={(text) => {
                                        setFirstName(text);
                                        clearError('name');
                                    }}
                                    autoCapitalize="words"
                                    maxLength={100}
                                    editable={!isSubmitting}
                                />
                            </FormField>

                            <FormField label="Apellido" style={styles.flex1}>
                                <AppInput
                                    placeholder="Ej. González"
                                    value={lastName}
                                    onChangeText={(text) => {
                                        setLastName(text);
                                        clearError('name');
                                    }}
                                    autoCapitalize="words"
                                    maxLength={100}
                                    editable={!isSubmitting}
                                />
                            </FormField>
                        </View>

                        <Text style={errors.name ? styles.errorText : styles.hint}>
                            {errors.name || 'Completá al menos uno de los dos.'}
                        </Text>
                    </View>

                    <FormField label="Email" error={errors.email}>
                        <AppInput
                            placeholder="maria@email.com"
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                clearError('email');
                            }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            maxLength={100}
                            editable={!isSubmitting}
                        />
                    </FormField>

                    <FormField label="Teléfono">
                        <AppInput
                            placeholder="11 1234-5678"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            maxLength={30}
                            editable={!isSubmitting}
                        />
                    </FormField>

                    <FormField label="Documento" error={errors.document}>
                        <View style={styles.chips}>
                            {DOCUMENT_TYPES.map((type) => (
                                <FilterChip
                                    key={type.value}
                                    label={type.label}
                                    selected={documentType === type.value}
                                    onPress={() => {
                                        if (isSubmitting) return;
                                        // Tocar el seleccionado lo quita (cliente sin documento).
                                        setDocumentType((current) => (current === type.value ? '' : type.value));
                                        clearError('document');
                                    }}
                                />
                            ))}
                        </View>

                        {documentType ? (
                            <AppInput
                                placeholder={NUMERIC_DOCUMENTS[documentType] ? 'Solo números' : 'Número de documento'}
                                value={documentNumber}
                                onChangeText={(text) => {
                                    setDocumentNumber(text);
                                    clearError('document');
                                }}
                                keyboardType={NUMERIC_DOCUMENTS[documentType] ? 'number-pad' : 'default'}
                                autoCapitalize="characters"
                                maxLength={50}
                                editable={!isSubmitting}
                            />
                        ) : null}
                    </FormField>

                    <FormField label="Observaciones">
                        <AppInput
                            placeholder="Notas internas sobre el cliente"
                            value={observations}
                            onChangeText={setObservations}
                            multiline
                            maxLength={1000}
                            textAlignVertical="top"
                            style={styles.observationsInput}
                            editable={!isSubmitting}
                        />
                    </FormField>
                </FormSection>

                {/* En la edición las direcciones se gestionan desde el detalle del cliente. */}
                {!isEdit ? (
                    <View style={SharedStyles.pageSection}>
                        <SectionHeader title={`Direcciones (${addresses.length})`} />
                        {addresses.length > 1 ? (
                            <Text style={styles.hint}>La primera queda como principal.</Text>
                        ) : null}

                        {addresses.map((address, index) => (
                            <View
                                key={index}
                                style={[SharedStyles.card, SharedStyles.listItem]}
                            >
                                <IconBadge
                                    icon={{ ios: 'mappin', android: 'location_on', web: 'location_on' }}
                                    tone={index === 0 ? 'primary' : 'neutral'}
                                />
                                <AddressSummary
                                    address={{ ...draftToDisplayAddress(address), isMain: index === 0 }}
                                />

                                <Pressable
                                    onPress={() => handleRemoveAddress(index)}
                                    disabled={isSubmitting}
                                    hitSlop={8}
                                    accessibilityRole="button"
                                    accessibilityLabel="Quitar dirección"
                                >
                                    <SymbolView
                                        name={{
                                            ios: 'trash',
                                            android: 'delete',
                                            web: 'delete',
                                        }}
                                        size={18}
                                        tintColor={Colors.error}
                                    />
                                </Pressable>
                            </View>
                        ))}

                        {showAddressForm ? (
                            <View style={[SharedStyles.card, styles.addressFormBox]}>
                                <Text style={styles.addressFormTitle}>
                                    Nueva dirección
                                </Text>

                                <AddressFields
                                    value={addressDraft}
                                    onChange={(next) => {
                                        setAddressDraft(next);
                                        setAddrError('');
                                    }}
                                />

                                {addrError ? (
                                    <Text style={styles.errorText}>
                                        {addrError}
                                    </Text>
                                ) : null}

                                <View style={styles.addressFormActions}>
                                    <AppButton
                                        title="Cancelar"
                                        variant="secondary"
                                        style={styles.flex1}
                                        onPress={() => {
                                            setShowAddressForm(false);
                                            setAddressDraft(EMPTY_ADDRESS_DRAFT);
                                            setAddrError('');
                                        }}
                                    />
                                    <AppButton
                                        title="Agregar"
                                        style={styles.flex1}
                                        onPress={handleAddAddress}
                                    />
                                </View>
                            </View>
                        ) : (
                            <Pressable
                                style={({ pressed }) => [styles.addAddressButton, pressed && SharedStyles.pressed]}
                                onPress={() => setShowAddressForm(true)}
                                disabled={isSubmitting}
                                accessibilityRole="button"
                            >
                                <SymbolView
                                    name={{
                                        ios: 'plus.circle',
                                        android: 'add_circle',
                                        web: 'add_circle',
                                    }}
                                    size={20}
                                    tintColor={Colors.primary}
                                />

                                <Text style={styles.addAddressButtonText}>
                                    Agregar dirección
                                </Text>
                            </Pressable>
                        )}
                    </View>
                ) : null}

                {submitError ? (
                    <View style={styles.submitErrorBox}>
                        <Text style={styles.submitErrorText}>{submitError}</Text>
                    </View>
                ) : null}
            </ScrollView>

            <FormFooter>
                <AppButton
                    title="Cancelar"
                    variant="secondary"
                    onPress={handleCancel}
                    disabled={isSubmitting}
                />
                <AppButton
                    title={isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar cliente'}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                />
            </FormFooter>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    nameBlock: {
        gap: Spacing.xs + 2,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    flex1: {
        flex: 1,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.xs,
    },
    observationsInput: {
        height: 96,
        paddingTop: Spacing.sm,
    },
    hint: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    errorText: {
        fontSize: 12,
        color: Colors.error,
    },
    addAddressButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
        paddingVertical: Spacing.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.primary,
        gap: Spacing.xs,
    },
    addAddressButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.primary,
    },
    addressFormBox: {
        gap: Spacing.md,
    },
    addressFormTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    addressFormActions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    submitErrorBox: {
        backgroundColor: Colors.errorLight,
        borderWidth: 1,
        borderColor: Colors.errorBorder,
        borderRadius: Radius.sm,
        padding: Spacing.md,
    },
    submitErrorText: {
        color: Colors.error,
        fontSize: 13,
    },
});
