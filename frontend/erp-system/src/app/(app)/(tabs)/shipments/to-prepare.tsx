import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { OrderCard } from '@/components/orders/OrderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useBranchStore } from '@/stores/branch-store';
import { useOrderStore } from '@/stores/order-store';
import { SharedStyles } from '@/styles/shared';

export default function ShipmentsToPrepareScreen() {
    const activeBranch = useBranchStore((state) => state.activeBranch);
    const orders = useOrderStore((state) => state.orders);

    const shipments = orders.filter(
        (order) =>
            order.deliveryType === 'SHIPPING' &&
            order.status === 'TO_PREPARE' &&
            (!activeBranch || order.branchId === activeBranch.id),
    );

    return (
        <Screen style={styles.screen}>
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={() => router.back()}
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

                <Text style={SharedStyles.headerTitle}>
                    Envíos a preparar
                </Text>

                <View style={SharedStyles.headerSpacer} />
            </View>

            <View style={SharedStyles.content}>
                <Text style={styles.resultsText}>
                    {shipments.length}{' '}
                    {shipments.length === 1
                        ? 'envío pendiente'
                        : 'envíos pendientes'}
                </Text>

                <FlatList
                    data={shipments}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <OrderCard
                            order={item}
                            onPress={() =>
                                router.push({
                                    pathname: '/shipments/[id]',
                                    params: { id: item.id },
                                })
                            }
                        />
                    )}
                    contentContainerStyle={
                        shipments.length === 0
                            ? SharedStyles.listEmpty
                            : styles.list
                    }
                    ListEmptyComponent={
                        <EmptyState
                            title="No hay envíos a preparar"
                            description="Los envíos pendientes de preparación aparecerán aquí."
                        />
                    }
                    showsVerticalScrollIndicator={false}
                />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },

    resultsText: {
        fontSize: 12,
        color: Colors.textSecondary,
        fontWeight: '500',
        marginBottom: Spacing.sm,
    },

    list: {
        gap: Spacing.sm,
        paddingBottom: Spacing.lg,
    },
});