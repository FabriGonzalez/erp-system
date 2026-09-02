import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

type QuantitySelectorProps = {
    max: number;
};

export function QuantitySelector({ max }: QuantitySelectorProps) {
    const [quantity, setQuantity] = useState(1);

    function increase() {
        if (quantity < max) {
            setQuantity(quantity + 1);
        }
    }

    function decrease() {
        if (quantity > 1) {
            setQuantity(quantity - 1);
        }
    }

    return (
        <View style={styles.container}>
            <Pressable style={styles.button} onPress={decrease}>
                <Text style={styles.buttonText}>−</Text>
            </Pressable>

            <Text style={styles.quantity}>{quantity}</Text>

            <Pressable style={styles.button} onPress={increase}>
                <Text style={styles.buttonText}>+</Text>
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

    buttonText: {
        fontSize: 22,
    },

    quantity: {
        fontSize: 18,
        fontWeight: '600',
    },
});