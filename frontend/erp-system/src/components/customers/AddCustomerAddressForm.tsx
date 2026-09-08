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

import { AppInput } from '@/components/ui/AppInput';
import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCustomerStore } from '@/stores/customer-store';
import { SharedStyles } from '@/styles/shared';
import { CustomerAddress } from '@/types/customer';

type AddCustomerAddressFormProps = {
    customerId: string;
    onAddressCreated?: (address: CustomerAddress) => void;
};

export function AddCustomerAddressForm({
    customerId,
    onAddressCreated,
}: AddCustomerAddressFormProps) {
    const customer = useCustomerStore((state) =>
        state.getCustomerById(customerId),
    );

    const addCustomerAddress = useCustomerStore(
        (state) => state.addCustomerAddress,
    );

    const [label, setLabel] = useState('');
    const [street, setStreet] = useState('');
    const [number, setNumber] = useState('');
    const [city, setCity] = useState('');
    const [province, setProvince] = useState('');
    const [zipCode, setZipCode] = useState('');
    const [formError, setFormError] = useState<string | null>(null);

    if (!customer) {
        return (
            <NotFound
                headerTitle="Agregar dirección"
                title="Cliente no encontrado"
                description="No se pudo encontrar el cliente al que querés agregar la dirección."
            />
        );
    }

    function handleSave() {
        setFormError(null);

        if (!label.trim()) {
            setFormError('Ingresá una etiqueta para la dirección.');
            return;
        }

        if (!street.trim()) {
            setFormError('Ingresá la calle.');
            return;
        }

        if (!number.trim()) {
            setFormError('Ingresá el número.');
            return;
        }

        if (!city.trim()) {
            setFormError('Ingresá la ciudad.');
            return;
        }

        if (!province.trim()) {
            setFormError('Ingresá la provincia.');
            return;
        }

        const newAddress = addCustomerAddress(customerId, {
            label: label.trim(),
            street: street.trim(),
            number: number.trim(),
            city: city.trim(),
            province: province.trim(),
            zipCode: zipCode.trim(),
        });

        if (!newAddress) {
            setFormError('No se pudo agregar la dirección.');
            return;
        }

        onAddressCreated?.(newAddress);

        router.back();
    }

    function handleCancel() {
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
                    <Text style={styles.headerTitle}>
                        Agregar dirección
                    </Text>

                    <Text style={styles.headerSubtitle}>
                        {customer.name}
                    </Text>
                </View>

                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.content}
            >
                <View style={styles.formCard}>
                    <Text style={styles.sectionTitle}>
                        Datos de la dirección
                    </Text>

                    <View style={styles.field}>
                        <Text style={styles.label}>Etiqueta</Text>

                        <AppInput
                            placeholder="Ej. Casa"
                            value={label}
                            onChangeText={setLabel}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.row}>
                        <View style={[styles.field, styles.streetField]}>
                            <Text style={styles.label}>Calle</Text>

                            <AppInput
                                placeholder="Ej. Av. Colón"
                                value={street}
                                onChangeText={setStreet}
                                autoCapitalize="words"
                            />
                        </View>

                        <View style={[styles.field, styles.numberField]}>
                            <Text style={styles.label}>Número</Text>

                            <AppInput
                                placeholder="123"
                                value={number}
                                onChangeText={setNumber}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Ciudad</Text>

                        <AppInput
                            placeholder="Ej. Bahía Blanca"
                            value={city}
                            onChangeText={setCity}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Provincia</Text>

                        <AppInput
                            placeholder="Ej. Buenos Aires"
                            value={province}
                            onChangeText={setProvince}
                            autoCapitalize="words"
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>Código postal</Text>

                        <AppInput
                            placeholder="Ej. 8000"
                            value={zipCode}
                            onChangeText={setZipCode}
                            keyboardType="numeric"
                        />
                    </View>

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
                        style={({ pressed }) => [
                            SharedStyles.buttonPrimary,
                            pressed && SharedStyles.pressed,
                        ]}
                    >
                        <Text style={SharedStyles.buttonPrimaryText}>
                            Guardar dirección
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: Spacing.xs,
        borderRadius: 8,
    },
    headerText: {
        flex: 1,
        marginLeft: Spacing.sm,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    headerSubtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    headerSpacer: {
        width: 32,
    },
    content: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
    },
    formCard: {
        backgroundColor: Colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: Colors.border,
        padding: Spacing.lg,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
        marginBottom: Spacing.lg,
    },
    field: {
        marginBottom: Spacing.md,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: Spacing.xs,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    streetField: {
        flex: 1,
    },
    numberField: {
        width: 110,
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