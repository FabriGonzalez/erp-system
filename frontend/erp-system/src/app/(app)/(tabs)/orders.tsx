import {
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function OrdersScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>
                Pedidos
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 24,
    },

    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
});