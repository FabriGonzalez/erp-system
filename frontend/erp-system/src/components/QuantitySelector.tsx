import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '@/constants/colors';

type QuantitySelectorProps = {
    max: number;
    initialValue?: number;
    onChange?: (quantity: number) => void;
};

export function QuantitySelector({ max, initialValue, onChange }: QuantitySelectorProps) {
    const [quantity, setQuantity] = useState(initialValue ?? 1);

    function increase() {
        if (quantity < max) {
            const next = quantity + 1;
            setQuantity(next);
            onChange?.(next);
        }
    }

    function decrease() {
        if (quantity > 1) {
            const next = quantity - 1;
            setQuantity(next);
            onChange?.(next);
        }
    }

    const canDecrease = quantity > 1;
    const canIncrease = quantity < max;

    return (
        <View style={styles.container}>
            <Pressable
                style={[styles.button, !canDecrease && styles.buttonDisabled]}
                onPress={decrease}
                disabled={!canDecrease}
            >
                <Text style={[styles.buttonText, !canDecrease && styles.buttonTextDisabled]}>−</Text>
            </Pressable>

            <Text style={styles.quantity}>{quantity}</Text>

            <Pressable
                style={[styles.button, !canIncrease && styles.buttonDisabled]}
                onPress={increase}
                disabled={!canIncrease}
            >
                <Text style={[styles.buttonText, !canIncrease && styles.buttonTextDisabled]}>+</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },

    button: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#eeeeee',
        alignItems: 'center',
        justifyContent: 'center',
    },

    buttonDisabled: {
        backgroundColor: '#F5F5F5',
        opacity: 0.5,
    },

    buttonText: {
        fontSize: 22,
        color: Colors.text,
    },

    buttonTextDisabled: {
        color: Colors.textSecondary,
    },

    quantity: {
        fontSize: 18,
        fontWeight: '600',
    },
});