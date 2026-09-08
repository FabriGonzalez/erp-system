import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { Customer } from '@/types/customer';

type OrderCustomerSectionProps = {
    customer: Customer;
    onSelectCustomer: () => void;
};

export function OrderCustomerSection({
    customer,
    onSelectCustomer,
}: OrderCustomerSectionProps) {
    const isAnonymous = customer.id === 'customer-anonymous';

    return (
        <View style={styles.container}>
            <Text style={SharedStyles.sectionTitle}>Cliente</Text>

            <Pressable
                style={({ pressed }) => [styles.card, pressed && SharedStyles.pressed]}
                onPress={onSelectCustomer}
            >
                <Avatar style={styles.avatar}>
                    <SymbolView
                        name={{
                            ios: isAnonymous ? 'person.fill.questionmark' : 'person.fill',
                            android: 'person',
                            web: 'person',
                        }}
                        size={22}
                        tintColor={Colors.primary}
                    />
                </Avatar>

                <View style={styles.info}>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    {!isAnonymous && customer.email ? (
                        <Text style={styles.customerDetail}>{customer.email}</Text>
                    ) : null}
                    {!isAnonymous && customer.phone ? (
                        <Text style={styles.customerDetail}>{customer.phone}</Text>
                    ) : null}
                    {isAnonymous ? (
                        <Text style={styles.customerDetail}>Venta sin datos de comprador</Text>
                    ) : null}
                </View>

                <View style={styles.changeAction}>
                    <Text style={styles.changeText}>Cambiar</Text>
                    <SymbolView
                        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                        size={16}
                        tintColor={Colors.primary}
                    />
                </View>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    avatar: {
        marginRight: Spacing.md,
    },
    info: {
        flex: 1,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
    },
    customerDetail: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    changeAction: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    changeText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.primary,
    },
});
