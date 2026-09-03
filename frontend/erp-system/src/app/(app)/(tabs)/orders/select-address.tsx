import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useOrderDraftStore } from '@/stores/order-draft-store';
import { SharedStyles } from '@/styles/shared';
import { CustomerAddress } from '@/types/customer';

export default function SelectAddressScreen() {
    const customer = useOrderDraftStore((state) => state.customer);
    const currentAddress = useOrderDraftStore((state) => state.address);
    const setDraftAddress = useOrderDraftStore((state) => state.setAddress);

    function handleSelectAddress(address: CustomerAddress) {
        setDraftAddress(address);
        router.back();
    }

    return (
        <Screen style={styles.screen}>
            {/* Header */}
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={SharedStyles.headerTitle}>Seleccionar Dirección</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

            <View style={styles.subHeader}>
                <Text style={styles.customerName}>Cliente: {customer.name}</Text>
                <Text style={styles.subTitle}>
                    Elegí a qué dirección del cliente querés enviar este pedido.
                </Text>
            </View>

            <FlatList
                data={customer.addresses}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <EmptyState
                        title="Sin direcciones registradas"
                        description="Este cliente no tiene direcciones asociadas a su perfil."
                        actionLabel="Agregar dirección"
                        onAction={() =>
                            router.push({
                                pathname: '/(app)/customers/new',
                                params: { fromOrder: 'true' },
                            })
                        }
                    />
                }
                renderItem={({ item }) => {
                    const isSelected = currentAddress?.id === item.id;

                    return (
                        <Pressable
                            style={({ pressed }) => [
                                styles.addressCard,
                                isSelected && styles.selectedCard,
                                pressed && SharedStyles.pressed,
                            ]}
                            onPress={() => handleSelectAddress(item)}
                        >
                            <View style={styles.labelBadge}>
                                <Text style={styles.labelBadgeText}>{item.label}</Text>
                            </View>

                            <View style={styles.addressInfo}>
                                <Text style={styles.streetText}>
                                    {item.street} {item.number}
                                </Text>
                                <Text style={styles.cityText}>
                                    {item.city}, {item.province} {item.zipCode ? `(${item.zipCode})` : ''}
                                </Text>
                            </View>

                            {isSelected && (
                                <SymbolView
                                    name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                                    size={20}
                                    tintColor={Colors.primary}
                                />
                            )}
                        </Pressable>
                    );
                }}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
        backgroundColor: Colors.background,
    },
    subHeader: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.md,
        paddingBottom: Spacing.xs,
    },
    customerName: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
    },
    subTitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    listContainer: {
        padding: Spacing.lg,
        paddingBottom: Spacing.xxl * 2,
    },
    addressCard: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.sm,
    },
    selectedCard: {
        borderColor: Colors.primary,
        backgroundColor: '#F0F9FF',
    },
    labelBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#EFF6FF',
        paddingHorizontal: Spacing.xs + 2,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 6,
    },
    labelBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.primary,
    },
    addressInfo: {
        marginBottom: 4,
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
});
