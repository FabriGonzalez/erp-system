import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

export default function SalesScreen() {
    return (
        <Screen style={styles.screen}>
            <View style={SharedStyles.topBar}>
                <View>
                    <Text style={SharedStyles.screenTitle}>Vender</Text>
                    <Text style={SharedStyles.screenSubtitle}>
                        Iniciá una operación de venta
                    </Text>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Nueva venta</Text>

                <Pressable
                    onPress={() =>
                        router.push({
                            pathname: '/orders/new',
                            params: { salesType: 'WITH_PRODUCTS' },
                        })
                    }
                    style={({ pressed }) => [
                        styles.action,
                        pressed && SharedStyles.pressed,
                    ]}
                >
                    <View style={styles.actionIcon}>
                        <SymbolView
                            name={{
                                ios: 'cart',
                                android: 'shopping_cart',
                                web: 'shopping_cart',
                            }}
                            size={22}
                            tintColor={Colors.primary}
                        />
                    </View>

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>Nueva venta</Text>
                        <Text style={styles.actionSubtitle}>
                            Cargar productos, cliente y pago
                        </Text>
                    </View>

                    <SymbolView
                        name={{
                            ios: 'chevron.right',
                            android: 'arrow_forward',
                            web: 'arrow_forward',
                        }}
                        size={20}
                        tintColor={Colors.textSecondary}
                    />
                </Pressable>

                <Pressable
                    onPress={() =>
                        router.push({
                            pathname: '/orders/new',
                            params: { salesType: 'QUICK_SALE' },
                        })
                    }                    
                    style={({ pressed }) => [
                        styles.action,
                        pressed && SharedStyles.pressed,
                    ]}
                >
                    <View style={styles.actionIcon}>
                        <SymbolView
                            name={{
                                ios: 'bolt',
                                android: 'bolt',
                                web: 'bolt',
                            }}
                            size={22}
                            tintColor={Colors.primary}
                        />
                    </View>

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>Venta rápida</Text>
                        <Text style={styles.actionSubtitle}>
                            Registrar una venta por importe
                        </Text>
                    </View>

                    <SymbolView
                        name={{
                            ios: 'chevron.right',
                            android: 'arrow_forward',
                            web: 'arrow_forward',
                        }}
                        size={20}
                        tintColor={Colors.textSecondary}
                    />
                </Pressable>
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },

    content: {
        flex: 1,
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.lg,
        gap: Spacing.sm,
    },

    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: Spacing.xs,
    },

    action: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        padding: Spacing.md,
    },

    actionIcon: {
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
        backgroundColor: Colors.background,
        marginRight: Spacing.md,
    },

    actionContent: {
        flex: 1,
    },

    actionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },

    actionSubtitle: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
});