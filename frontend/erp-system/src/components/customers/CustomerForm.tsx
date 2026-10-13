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
import { AddressSummary } from '@/components/customers/AddressSummary';
import { AppInput } from '@/components/ui/AppInput';
import { FilterChip } from '@/components/ui/FilterChip';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
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
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={handleCancel}
                    style={({ pressed }) => [
                        SharedStyles.backButton,
                        pressed && SharedStyles.pressed,
                    ]}
                    disabled={isSubmitting}
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

                <Text style={SharedStyles.headerTitle}>
                    {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
                </Text>

                <View style={SharedStyles.headerSpacer} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.row}>
                    <View style={[styles.formGroup, styles.flex1]}>
                        <Text style={SharedStyles.sectionTitle}>Nombre</Text>
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
                    </View>

                    <View style={[styles.formGroup, styles.flex1]}>
                        <Text style={SharedStyles.sectionTitle}>Apellido</Text>
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
                    </View>
                </View>

                {errors.name ? (
                    <Text style={[styles.errorText, styles.nameError]}>
                        {errors.name}
                    </Text>
                ) : (
                    <Text style={styles.hint}>
                        Completá al menos uno de los dos.
                    </Text>
                )}

                <View style={styles.formGroup}>
                    <Text style={SharedStyles.sectionTitle}>Email</Text>

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

                    {errors.email ? (
                        <Text style={styles.errorText}>{errors.email}</Text>
                    ) : null}
                </View>

                <View style={styles.formGroup}>
                    <Text style={SharedStyles.sectionTitle}>Teléfono</Text>

                    <AppInput
                        placeholder="11 1234-5678"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                        maxLength={30}
                        editable={!isSubmitting}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={SharedStyles.sectionTitle}>Documento</Text>

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

                    {errors.document ? (
                        <Text style={styles.errorText}>{errors.document}</Text>
                    ) : null}
                </View>

                <View style={styles.formGroup}>
                    <Text style={SharedStyles.sectionTitle}>Observaciones</Text>

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
                </View>

                {/* En la edición las direcciones se gestionan desde el detalle del cliente. */}
                {!isEdit ? (
                <>
                <View style={styles.sectionHeader}>
                    <Text style={SharedStyles.cardTitle}>
                        Direcciones ({addresses.length})
                    </Text>
                    {addresses.length > 1 ? (
                        <Text style={styles.hint}>La primera queda como principal.</Text>
                    ) : null}
                </View>

                {addresses.map((address, index) => (
                    <View
                        key={index}
                        style={styles.addressCard}
                    >
                        <AddressSummary
                            address={{ ...draftToDisplayAddress(address), isMain: index === 0 }}
                        />

                        <Pressable
                            onPress={() => handleRemoveAddress(index)}
                            disabled={isSubmitting}
                            hitSlop={8}
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
                    <View style={styles.addressFormBox}>
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
                            <Pressable
                                style={styles.addAddrConfirmButton}
                                onPress={handleAddAddress}
                            >
                                <Text style={styles.addAddrConfirmText}>
                                    Agregar dirección
                                </Text>
                            </Pressable>

                            <Pressable
                                style={styles.cancelAddrButton}
                                onPress={() => {
                                    setShowAddressForm(false);
                                    setAddressDraft(EMPTY_ADDRESS_DRAFT);
                                    setAddrError('');
                                }}
                            >
                                <Text style={styles.cancelAddrText}>
                                    Cancelar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                ) : (
                    <Pressable
                        style={styles.addAddressButton}
                        onPress={() => setShowAddressForm(true)}
                        disabled={isSubmitting}
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

                </>
                ) : null}

                {submitError ? (
                    <View style={styles.submitErrorBox}>
                        <Text style={styles.submitErrorText}>{submitError}</Text>
                    </View>
                ) : null}

                <View style={styles.actionsContainer}>
                    <Pressable
                        style={[
                            SharedStyles.buttonSubmit,
                            isSubmitting &&
                            styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <View style={styles.submittingContent}>
                                <ActivityIndicator
                                    size="small"
                                    color={Colors.white}
                                />

                                <Text style={SharedStyles.buttonSubmitText}>
                                    Guardando...
                                </Text>
                            </View>
                        ) : (
                            <Text style={SharedStyles.buttonSubmitText}>
                                {isEdit ? 'Guardar cambios' : 'Guardar cliente'}
                            </Text>
                        )}
                    </Pressable>

                    <Pressable
                        style={SharedStyles.buttonCancel}
                        onPress={handleCancel}
                        disabled={isSubmitting}
                    >
                        <Text style={SharedStyles.buttonCancelText}>
                            Cancelar
                        </Text>
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
    scrollContainer: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
    },
    formGroup: {
        marginBottom: Spacing.lg,
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
        marginBottom: Spacing.sm,
    },
    observationsInput: {
        height: 96,
        paddingTop: Spacing.sm,
    },
    hint: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: -Spacing.sm,
        marginBottom: Spacing.lg,
    },
    nameError: {
        marginTop: -Spacing.sm,
        marginBottom: Spacing.lg,
    },
    errorText: {
        fontSize: 12,
        color: Colors.error,
        marginTop: 4,
        fontWeight: '500',
    },
    sectionHeader: {
        marginTop: Spacing.md,
        marginBottom: Spacing.sm,
    },
    addressCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.sm,
        backgroundColor: Colors.surface,
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.sm,
    },
    addAddressButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 10,
        paddingVertical: Spacing.md,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: Colors.primary,
        gap: Spacing.xs,
        marginBottom: Spacing.xl,
    },
    addAddressButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
    addressFormBox: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.xl,
    },
    addressFormTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.md,
    },
    addressFormActions: {
        flexDirection: 'row',
        gap: Spacing.md,
        marginTop: Spacing.xs,
    },
    addAddrConfirmButton: {
        flex: 1,
        backgroundColor: Colors.primary,
        height: 40,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addAddrConfirmText: {
        color: Colors.white,
        fontWeight: '600',
        fontSize: 13,
    },
    cancelAddrButton: {
        height: 40,
        paddingHorizontal: Spacing.md,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelAddrText: {
        color: Colors.textSecondary,
        fontWeight: '500',
        fontSize: 13,
    },
    submitErrorBox: {
        backgroundColor: Colors.errorLight,
        borderWidth: 1,
        borderColor: Colors.errorBorder,
        borderRadius: 8,
        padding: Spacing.md,
        marginBottom: Spacing.md,
    },
    submitErrorText: {
        color: Colors.error,
        fontSize: 13,
    },
    actionsContainer: {
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submittingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
});
