import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

export default function ShipmentsScreen() {
    function handleCreateShipment() {
        router.push('/shipments/new');
    }

    return (
        <Screen style={styles.screen}>
            <View style={SharedStyles.topBar}>
                <View>
                    <Text style={SharedStyles.screenTitle}>Envíos</Text>
                    <Text style={SharedStyles.screenSubtitle}>
                        Gestión y preparación de envíos
                    </Text>
                </View>

                <Pressable
                    onPress={handleCreateShipment}
                    accessibilityRole="button"
                    accessibilityLabel="Crear nuevo envío"
                    hitSlop={6}
                    style={({ pressed }) => [
                        SharedStyles.addButton,
                        pressed && SharedStyles.pressed,
                    ]}
                >
                    <View style={SharedStyles.addIconContainer}>
                        <SymbolView
                            name={{
                                ios: 'plus',
                                android: 'add',
                                web: 'add',
                            }}
                            size={24}
                            tintColor={Colors.white}
                        />
                    </View>

                    <Text style={SharedStyles.addButtonText}>
                        Nuevo envío
                    </Text>
                </Pressable>
            </View>

            <View style={styles.content}>
                <Text style={styles.sectionTitle}>Trabajo pendiente</Text>

                <Pressable
                    onPress={() => router.push('/shipments/to-prepare')}
                    style={({ pressed }) => [
                        styles.action,
                        pressed && SharedStyles.pressed,
                    ]}
                >
                    <View style={styles.actionIcon}>
                        <SymbolView
                            name={{
                                ios: 'shippingbox',
                                android: 'local_shipping',
                                web: 'local_shipping',
                            }}
                            size={22}
                            tintColor={Colors.primary}
                        />
                    </View>

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>A preparar</Text>
                        <Text style={styles.actionSubtitle}>
                            Envíos que requieren preparación
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
    },

    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.textSecondary,
        marginBottom: Spacing.sm,
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