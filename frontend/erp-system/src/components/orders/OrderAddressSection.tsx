import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { Customer, CustomerAddress } from '@/types/customer';

type OrderAddressSectionProps = {
    customer: Customer;
    selectedAddress?: CustomerAddress;
    onSelectAddress: () => void;
    onAddCustomerAddress: () => void;
};

export function OrderAddressSection({
    customer,
    selectedAddress,
    onSelectAddress,
    onAddCustomerAddress,
}: OrderAddressSectionProps) {
    const hasAddresses = customer.addresses.length > 0;

    return (
        <View style={styles.container}>
            <Text style={SharedStyles.sectionTitle}>Dirección de Envío</Text>

            {!hasAddresses ? (
                <View style={styles.warningCard}>
                    <View style={styles.warningHeader}>
                        <SymbolView
                            name={{
                                ios: 'exclamationmark.triangle.fill',
                                android: 'warning',
                                web: 'warning',
                            }}
                            size={20}
                            tintColor="#D97706"
                        />
                        <Text style={styles.warningTitle}>
                            Sin direcciones registradas
                        </Text>
                    </View>

                    <Text style={styles.warningDescription}>
                        Este cliente no tiene direcciones cargadas. Agregá una
                        dirección antes de continuar con un envío.
                    </Text>

                    <Pressable
                        style={({ pressed }) => [
                            styles.addAddressBtn,
                            pressed && SharedStyles.pressed,
                        ]}
                        onPress={onAddCustomerAddress}
                    >
                        <SymbolView
                            name={{
                                ios: 'plus.circle.fill',
                                android: 'add_circle',
                                web: 'add_circle',
                            }}
                            size={18}
                            tintColor={Colors.primary}
                        />
                        <Text style={styles.addAddressBtnText}>
                            Agregar dirección al cliente
                        </Text>
                    </Pressable>
                </View>
            ) : selectedAddress ? (
                <View style={styles.addressCard}>
                    <View style={styles.addressHeader}>
                        <View style={styles.labelBadge}>
                            <Text style={styles.labelBadgeText}>
                                {selectedAddress.label}
                            </Text>
                        </View>

                        <Pressable
                            onPress={onSelectAddress}
                            style={styles.changeBtn}
                        >
                            <Text style={styles.changeBtnText}>
                                Cambiar dirección
                            </Text>
                        </Pressable>
                    </View>

                    <Text style={styles.streetText}>
                        {selectedAddress.street} {selectedAddress.number}
                    </Text>

                    <Text style={styles.cityText}>
                        {selectedAddress.city}, {selectedAddress.province}{' '}
                        {selectedAddress.zipCode
                            ? `(${selectedAddress.zipCode})`
                            : ''}
                    </Text>
                </View>
            ) : (
                <Pressable
                    style={({ pressed }) => [
                        styles.selectPromptCard,
                        pressed && SharedStyles.pressed,
                    ]}
                    onPress={onSelectAddress}
                >
                    <SymbolView
                        name={{
                            ios: 'mappin.circle',
                            android: 'location_on',
                            web: 'location_on',
                        }}
                        size={22}
                        tintColor={Colors.primary}
                    />

                    <Text style={styles.selectPromptText}>
                        Seleccionar dirección de envío
                    </Text>

                    <SymbolView
                        name={{
                            ios: 'chevron.right',
                            android: 'chevron_right',
                            web: 'chevron_right',
                        }}
                        size={16}
                        tintColor={Colors.textSecondary}
                    />
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
    },
    warningCard: {
        backgroundColor: '#FEF3C7',
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: '#FDE68A',
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    warningTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#92400E',
    },
    warningDescription: {
        fontSize: 13,
        color: '#B45309',
        lineHeight: 18,
        marginBottom: Spacing.sm,
    },
    addAddressBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        paddingVertical: Spacing.sm,
        paddingHorizontal: Spacing.md,
        gap: 6,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    addAddressBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },
    addressCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    addressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    labelBadge: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: Spacing.xs + 2,
        paddingVertical: 2,
        borderRadius: 4,
    },
    labelBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    changeBtn: {
        paddingVertical: 2,
    },
    changeBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    streetText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    cityText: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    selectPromptCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        gap: Spacing.md,
    },
    selectPromptText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
        color: Colors.primary,
    },
});