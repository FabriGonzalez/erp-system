import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { DeliveryType } from '@/types/order';

type OrderDeliverySectionProps = {
    deliveryType: DeliveryType;
    onChangeDeliveryType: (type: DeliveryType) => void;
    disabled?: boolean;
};

export function OrderDeliverySection({
    deliveryType,
    onChangeDeliveryType,
    disabled = false,
}: OrderDeliverySectionProps) {
    return (
        <View style={styles.container}>
            <Text style={SharedStyles.sectionTitle}>Tipo de Entrega</Text>

            <View style={styles.deliveryOptions}>
                <Pressable
                    style={[
                        styles.deliveryOption,
                        deliveryType === 'LOCAL_PICKUP' && styles.deliveryOptionActive,
                    ]}
                    onPress={() => !disabled && onChangeDeliveryType('LOCAL_PICKUP')}
                >
                    <Text
                        style={[
                            styles.deliveryOptionText,
                            deliveryType === 'LOCAL_PICKUP' && styles.deliveryOptionTextActive,
                        ]}
                    >
                        Retiro en local
                    </Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.deliveryOption,
                        deliveryType === 'SHIPPING' && styles.deliveryOptionActive,
                    ]}
                    onPress={() => !disabled && onChangeDeliveryType('SHIPPING')}
                >
                    <Text
                        style={[
                            styles.deliveryOptionText,
                            deliveryType === 'SHIPPING' && styles.deliveryOptionTextActive,
                        ]}
                    >
                        Envío a domicilio
                    </Text>
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
    },
    deliveryOptions: {
        flexDirection: 'row',
        gap: Spacing.sm,
    },
    deliveryOption: {
        flex: 1,
        height: 46,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: Colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.surface,
    },
    deliveryOptionActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    deliveryOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    deliveryOptionTextActive: {
        color: '#FFFFFF',
    },
});
