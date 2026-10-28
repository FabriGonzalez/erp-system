import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AddressSummary } from '@/components/customers/AddressSummary';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { Customer, CustomerAddress } from '@/types/customer';
import { OrderShippingAddress } from '@/types/order';

type OrderAddressSectionProps = {
    customer: Customer;
    selectedAddress?: CustomerAddress;
    // La dirección elegida se desactivó o se eliminó después de seleccionarla.
    isSelectedAddressUnavailable?: boolean;
    onSelectAddress: () => void;
    onAddCustomerAddress: () => void;
};

export function OrderAddressSection({
    customer,
    selectedAddress,
    isSelectedAddressUnavailable = false,
    onSelectAddress,
    onAddCustomerAddress,
}: OrderAddressSectionProps) {
    const hasAddresses = customer.addressCount > 0;

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
                            tintColor={Colors.warningDark}
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
                        <AddressSummary address={selectedAddress} />

                        <View style={styles.addressActions}>
                            <Pressable
                                onPress={onAddCustomerAddress}
                                style={styles.linkBtn}
                            >
                                <Text style={styles.linkBtnText}>
                                    Agregar dirección
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={onSelectAddress}
                                style={styles.linkBtn}
                            >
                                <Text style={styles.linkBtnText}>
                                    Cambiar
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            ) : (
                <View style={styles.selectGroup}>
                    {isSelectedAddressUnavailable ? (
                        <Text style={styles.unavailableText}>
                            La dirección elegida ya no está disponible. Seleccioná otra.
                        </Text>
                    ) : null}

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
                            Agregar nueva dirección
                        </Text>
                    </Pressable>
                </View>
            )}
        </View>
    );
}

type OrderEditAddressSectionProps = {
    // La que el envío tiene guardada; falta en los envíos creados antes de guardarla.
    currentAddress?: OrderShippingAddress;
    // La dirección del cliente elegida para reemplazarla, si se eligió una.
    selectedAddress?: CustomerAddress;
    isSelectedAddressUnavailable?: boolean;
    onSelectAddress: () => void;
};

/** Al editar un envío: muestra la dirección guardada y permite cambiarla. */
export function OrderEditAddressSection({
    currentAddress,
    selectedAddress,
    isSelectedAddressUnavailable = false,
    onSelectAddress,
}: OrderEditAddressSectionProps) {
    const shownAddress = selectedAddress ?? currentAddress;

    return (
        <View style={styles.container}>
            <Text style={SharedStyles.sectionTitle}>Dirección de Envío</Text>

            {isSelectedAddressUnavailable ? (
                <Text style={[styles.unavailableText, styles.unavailableSpacing]}>
                    La dirección elegida ya no está disponible. Seleccioná otra.
                </Text>
            ) : null}

            {shownAddress ? (
                <View style={styles.addressCard}>
                    <View style={styles.addressHeader}>
                        <AddressSummary address={shownAddress} />

                        <Pressable onPress={onSelectAddress} style={styles.linkBtn}>
                            <Text style={styles.linkBtnText}>Cambiar</Text>
                        </Pressable>
                    </View>
                    {selectedAddress ? (
                        <Text style={styles.changeNote}>
                            Se guardará al confirmar los cambios.
                        </Text>
                    ) : null}
                </View>
            ) : (
                <View style={styles.selectGroup}>
                    <Text style={styles.missingText}>
                        Este envío no tiene una dirección registrada.
                    </Text>

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
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
    },
    unavailableSpacing: {
        marginBottom: Spacing.sm,
    },
    changeNote: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: Spacing.sm,
    },
    missingText: {
        fontSize: 13,
        color: Colors.textSecondary,
    },
    warningCard: {
        backgroundColor: Colors.warningLight,
        borderRadius: Radius.lg,
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
        color: Colors.warningText,
    },
    warningDescription: {
        fontSize: 13,
        color: Colors.warningTextSecondary,
        lineHeight: 18,
        marginBottom: Spacing.sm,
    },
    addAddressBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radius.sm,
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
        borderRadius: Radius.lg,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    addressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: Spacing.sm,
    },
    addressActions: {
        alignItems: 'flex-end',
        gap: Spacing.xs,
    },
    linkBtn: {
        paddingVertical: 2,
    },
    linkBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    selectGroup: {
        gap: Spacing.sm,
    },
    unavailableText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.warningText,
    },
    selectPromptCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: Radius.lg,
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