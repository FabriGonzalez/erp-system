import { StyleSheet, Text, View } from 'react-native';

type BranchCardProps = {
    branch: string;
};

export function BranchCard({ branch }: BranchCardProps) {
    return (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>Sucursal activa</Text>
            <Text style={styles.branch}>{branch}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 20,
        borderRadius: 16,
        backgroundColor: '#f2f2f2',
    },

    cardTitle: {
        fontSize: 14,
        color: '#666',
    },

    branch: {
        marginTop: 8,
        fontSize: 20,
        fontWeight: '600',
    },
});