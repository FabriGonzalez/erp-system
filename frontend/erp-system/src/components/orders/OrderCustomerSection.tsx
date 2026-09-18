import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { Customer } from '@/types/customer';
import { formatCurrency } from '@/utils/format';

type OrderCustomerSectionProps = {
    customer: Customer;
    customerCredit?: number;
    onSelectCustomer: () => void;
};

export function OrderCustomerSection({
    customer,
    customerCredit = 0,
    onSelectCustomer,
}: OrderCustomerSectionProps) {
    const isAnonymous = customer.id === 'customer-anonymous';

    return (
        <View style={styles.container}>
            <Text style={SharedStyles.sectionTitle}>Cliente</Text>

            <Pressable
                style={({ pressed }) => [SharedStyles.rowCard, pressed && SharedStyles.pressed]}
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

            {!isAnonymous && customerCredit > 0 && (
                <View style={styles.creditNotice}>
                    <Text style={styles.creditNoticeTitle}>Saldo a favor</Text>
                    <Text style={styles.creditNoticeAmount}>
                        {formatCurrency(customerCredit)}
                    </Text>
                    <Text style={styles.creditNoticeText}>
                        Este saldo puede utilizarse automáticamente para esta compra.
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: Spacing.lg,
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
    creditNotice: {
        marginTop: Spacing.sm,
        padding: Spacing.md,
        borderRadius: 10,
        backgroundColor: Colors.successLight,
        borderWidth: 1,
        borderColor: Colors.successBorder,
    },
    creditNoticeTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: Colors.successDark,
        textTransform: 'uppercase',
    },
    creditNoticeAmount: {
        marginTop: 2,
        fontSize: 20,
        fontWeight: '700',
        color: Colors.successDark,
    },
    creditNoticeText: {
        marginTop: 4,
        fontSize: 13,
        color: Colors.successDark,
    },
});
