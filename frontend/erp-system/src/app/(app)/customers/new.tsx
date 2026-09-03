import { router, useLocalSearchParams } from 'expo-router';
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

import { AppInput } from '@/components/ui/AppInput';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCustomerStore } from '@/stores/customer-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';
import { CustomerAddress } from '@/types/customer';

export default function NewCustomerScreen() {
    const { fromOrder } = useLocalSearchParams<{ fromOrder?: string }>();

    const addCustomer = useCustomerStore((state) => state.addCustomer);
    const setDraftCustomer = useOrderDraftStore((state) => state.setCustomer);

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const [addresses, setAddresses] = useState<
        Omit<CustomerAddress, 'id'>[]
    >([]);

    const [showAddressForm, setShowAddressForm] = useState(false);
    const [addrLabel, setAddrLabel] = useState('');
    const [addrStreet, setAddrStreet] = useState('');
    const [addrNumber, setAddrNumber] = useState('');
    const [addrCity, setAddrCity] = useState('');
    const [addrProvince, setAddrProvince] = useState('');
    const [addrZipCode, setAddrZipCode] = useState('');

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [addrError, setAddrError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    function handleAddAddress() {
        if (
            !addrStreet.trim() ||
            !addrNumber.trim() ||
            !addrCity.trim() ||
            !addrProvince.trim()
        ) {
            setAddrError(
                'Completa al menos Calle, Número, Ciudad y Provincia.',
            );
            return;
        }

        setAddresses((currentAddresses) => [
            ...currentAddresses,
            {
                label: addrLabel.trim() || 'Principal',
                street: addrStreet.trim(),
                number: addrNumber.trim(),
                city: addrCity.trim(),
                province: addrProvince.trim(),
                zipCode: addrZipCode.trim(),
            },
        ]);

        setAddrLabel('');
        setAddrStreet('');
        setAddrNumber('');
        setAddrCity('');
        setAddrProvince('');
        setAddrZipCode('');
        setAddrError('');
        setShowAddressForm(false);
    }

    function handleRemoveAddress(index: number) {
        setAddresses((currentAddresses) =>
            currentAddresses.filter((_, currentIndex) => currentIndex !== index),
        );
    }

    function validate(): boolean {
        const newErrors: Record<string, string> = {};

        if (!name.trim()) {
            newErrors.name = 'El nombre del cliente es obligatorio.';
        }

        setErrors(newErrors);

        return Object.keys(newErrors).length === 0;
    }

    function handleSubmit() {
        if (!validate()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const newCustomer = addCustomer({
                name: name.trim(),
                email: email.trim() || undefined,
                phone: phone.trim() || undefined,
                addresses: addresses.map((address) => ({
                    ...address,
                    id: `addr - ${Date.now()} -${Math.random()} `,
                })),
            });

            if (fromOrder === 'true') {
                setDraftCustomer(newCustomer);
            }

            router.back();
        } catch (error) {
            console.error('Error al crear cliente:', error);
        } finally {
            setIsSubmitting(false);
        }
    }

    function handleCancel() {
        if (isSubmitting) {
            return;
        }

        router.back();
    }

    return (
        <Screen style={styles.screen}>
            <View style={styles.header}>
                <Pressable
                    onPress={handleCancel}
                    style={({ pressed }) => [
                        styles.backButton,
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

                <Text style={styles.headerTitle}>Nuevo Cliente</Text>

                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContainer}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.formGroup}>
                    <Text style={styles.label}>
                        Nombre completo{' '}
                        <Text style={styles.required}>*</Text>
                    </Text>

                    <AppInput
                        placeholder="Ej. María González"
                        value={name}
                        onChangeText={(text) => {
                            setName(text);

                            if (errors.name) {
                                setErrors((currentErrors) => ({
                                    ...currentErrors,
                                    name: '',
                                }));
                            }
                        }}
                    />

                    {errors.name ? (
                        <Text style={styles.errorText}>
                            {errors.name}
                        </Text>
                    ) : null}
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Email</Text>

                    <AppInput
                        placeholder="maria@email.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Teléfono</Text>

                    <AppInput
                        placeholder="11 1234-5678"
                        value={phone}
                        onChangeText={setPhone}
                        keyboardType="phone-pad"
                    />
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Direcciones ({addresses.length})
                    </Text>
                </View>

                {addresses.map((address, index) => (
                    <View key={`${address.street} -${address.number} -${index} `} style={styles.addressCard}>
                        <View style={styles.addressCardHeader}>
                            <View style={styles.labelBadge}>
                                <Text style={styles.labelBadgeText}>
                                    {address.label}
                                </Text>
                            </View>

                            <Pressable
                                onPress={() => handleRemoveAddress(index)}
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

                        <Text style={styles.addressText}>
                            {address.street} {address.number}
                        </Text>

                        <Text style={styles.addressSubtext}>
                            {address.city}, {address.province}
                            {address.zipCode
                                ? ` (${address.zipCode})`
                                : ''}
                        </Text>
                    </View>
                ))}

                {showAddressForm ? (
                    <View style={styles.addressFormBox}>
                        <Text style={styles.addressFormTitle}>
                            Nueva dirección
                        </Text>

                        <View style={styles.formGroup}>
                            <Text style={styles.subLabel}>
                                Etiqueta (ej. Casa, Oficina)
                            </Text>

                            <AppInput
                                placeholder="Casa"
                                value={addrLabel}
                                onChangeText={setAddrLabel}
                            />
                        </View>

                        <View style={styles.row}>
                            <View
                                style={[
                                    styles.formGroup,
                                    styles.flex2,
                                ]}
                            >
                                <Text style={styles.subLabel}>
                                    Calle *
                                </Text>

                                <AppInput
                                    placeholder="Av. Corrientes"
                                    value={addrStreet}
                                    onChangeText={setAddrStreet}
                                />
                            </View>

                            <View
                                style={[
                                    styles.formGroup,
                                    styles.flex1,
                                ]}
                            >
                                <Text style={styles.subLabel}>
                                    Número *
                                </Text>

                                <AppInput
                                    placeholder="1234"
                                    value={addrNumber}
                                    onChangeText={setAddrNumber}
                                    keyboardType="number-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View
                                style={[
                                    styles.formGroup,
                                    styles.flex1,
                                ]}
                            >
                                <Text style={styles.subLabel}>
                                    Ciudad *
                                </Text>

                                <AppInput
                                    placeholder="CABA"
                                    value={addrCity}
                                    onChangeText={setAddrCity}
                                />
                            </View>

                            <View
                                style={[
                                    styles.formGroup,
                                    styles.flex1,
                                ]}
                            >
                                <Text style={styles.subLabel}>
                                    Provincia *
                                </Text>

                                <AppInput
                                    placeholder="Buenos Aires"
                                    value={addrProvince}
                                    onChangeText={setAddrProvince}
                                />
                            </View>
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.subLabel}>
                                Código Postal
                            </Text>

                            <AppInput
                                placeholder="C1042"
                                value={addrZipCode}
                                onChangeText={setAddrZipCode}
                            />
                        </View>

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
                                    Guardar Dirección
                                </Text>
                            </Pressable>

                            <Pressable
                                style={styles.cancelAddrButton}
                                onPress={() => {
                                    setShowAddressForm(false);
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

                <View style={styles.actionsContainer}>
                    <Pressable
                        style={[
                            styles.submitButton,
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
                                    color="#FFFFFF"
                                />

                                <Text style={styles.submitButtonText}>
                                    Guardando...
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.submitButtonText}>
                                Guardar cliente
                            </Text>
                        )}
                    </Pressable>

                    <Pressable
                        style={styles.cancelButton}
                        onPress={handleCancel}
                        disabled={isSubmitting}
                    >
                        <Text style={styles.cancelButtonText}>
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
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    headerSpacer: {
        width: 32,
    },
    scrollContainer: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
    },
    formGroup: {
        marginBottom: Spacing.lg,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.xs + 2,
    },
    subLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: Colors.textSecondary,
        marginBottom: 4,
    },
    required: {
        color: Colors.error,
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
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    addressCard: {
        backgroundColor: Colors.surface,
        borderRadius: 10,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.sm,
    },
    addressCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    labelBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: Spacing.xs + 2,
        paddingVertical: 2,
        borderRadius: 4,
    },
    labelBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    addressText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    addressSubtext: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
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
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    flex1: {
        flex: 1,
    },
    flex2: {
        flex: 2,
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
        color: '#FFFFFF',
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
    actionsContainer: {
        gap: Spacing.sm,
        marginTop: Spacing.md,
    },
    submitButton: {
        backgroundColor: Colors.primary,
        height: 50,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submittingContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelButton: {
        height: 48,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    cancelButtonText: {
        color: Colors.textSecondary,
        fontSize: 15,
        fontWeight: '500',
    },
});

