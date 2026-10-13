import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { AddressSummary } from '@/components/customers/AddressSummary';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useCustomerAddresses } from '@/hooks/use-customer-queries';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';
import { CustomerAddress } from '@/types/customer';

type AddressFlow = 'orders' | 'shipments';

type SelectAddressScreenProps = {
    flow: AddressFlow;
};

export function SelectAddressScreen({ flow }: SelectAddressScreenProps) {
    const customer = useOrderDraftStore((state) => state.customer);
    const currentAddress = useOrderDraftStore((state) => state.address);
    const setDraftAddress = useOrderDraftStore((state) => state.setAddress);
    // Solo las activas: una inactiva no se puede elegir para un envío.
    const { addresses, error, isLoading, reload } = useCustomerAddresses(customer.id, { activeOnly: true });
    const addAddressRoute = flow === 'shipments'
        ? '/shipments/add-address'
        : '/orders/add-address';

    function handleSelectAddress(address: CustomerAddress) {
        setDraftAddress(address);
        router.back();
    }

    function handleAddAddress() {
        router.push({
            pathname: addAddressRoute,
            params: { id: customer.id },
        });
    }

    return (
        <Screen style={styles.screen}>
            <View style={SharedStyles.header}>
                <Pressable onPress={() => router.back()} style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}>
                    <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={24} tintColor={Colors.text} />
                </Pressable>
                <Text style={SharedStyles.headerTitle}>Seleccionar Dirección</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

            <View style={styles.subHeader}>
                <Text style={styles.customerName}>Cliente: {customer.name}</Text>
                <Text style={styles.subTitle}>Elegí a qué dirección del cliente querés enviar este pedido.</Text>
            </View>

            <FlatList
                data={addresses}
                keyExtractor={(item) => item.id}
                contentContainerStyle={SharedStyles.listContent}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <Pressable style={({ pressed }) => [styles.addAddressBtn, pressed && SharedStyles.pressed]} onPress={handleAddAddress}>
                        <SymbolView name={{ ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }} size={18} tintColor={Colors.primary} />
                        <Text style={styles.addAddressBtnText}>Agregar nueva dirección</Text>
                    </Pressable>
                }
                ListEmptyComponent={
                    isLoading ? (
                        <LoadingState label="Cargando direcciones..." />
                    ) : error ? (
                        <EmptyState title="No se pudieron cargar las direcciones" description={error} actionLabel="Reintentar" onAction={reload} />
                    ) : (
                        <EmptyState title="Sin direcciones registradas" description="Este cliente no tiene direcciones asociadas a su perfil." actionLabel="Agregar dirección" onAction={handleAddAddress} />
                    )
                }
                renderItem={({ item }) => {
                    const isSelected = currentAddress?.id === item.id;
                    return (
                        <Pressable style={({ pressed }) => [styles.addressCard, isSelected && styles.selectedCard, pressed && SharedStyles.pressed]} onPress={() => handleSelectAddress(item)}>
                            <AddressSummary address={item} />
                            {isSelected && <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={20} tintColor={Colors.primary} />}
                        </Pressable>
                    );
                }}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: { padding: 0, backgroundColor: Colors.background },
    subHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.xs },
    customerName: { fontSize: 15, fontWeight: '700', color: Colors.text },
    subTitle: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
    addAddressBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, borderWidth: 1, borderStyle: 'dashed', borderColor: Colors.primary, gap: Spacing.xs, marginBottom: Spacing.md },
    addAddressBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
    addressCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: Colors.surface, borderRadius: 12, padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.sm },
    selectedCard: { borderColor: Colors.primary, backgroundColor: Colors.selected },
});
