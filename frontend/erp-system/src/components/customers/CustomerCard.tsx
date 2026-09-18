import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { Customer } from '@/types/customer';
import { getInitials } from '@/utils/format';

type CustomerCardProps = {
    customer: Customer;
    onPress?: () => void;
};

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
    const addressCount = customer.addresses.length;

    return (
        <Pressable
            style={({ pressed }) => [SharedStyles.rowCard, styles.card, pressed && SharedStyles.pressed]}
            onPress={onPress}
        >
            <Avatar
                name={customer.name}
                initials={customer.name ? getInitials(customer.name) : 'C'}
                size={44}
                fontWeight="700"
                fontSize={16}
                style={styles.avatar}
            />

            <View style={styles.info}>
                <Text style={styles.name}>{customer.name}</Text>
                {customer.email ? (
                    <Text style={styles.detailText}>{customer.email}</Text>
                ) : null}
                {customer.phone ? (
                    <Text style={styles.detailText}>{customer.phone}</Text>
                ) : null}

                <View style={styles.addressBadge}>
                    <SymbolView
                        name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
                        size={12}
                        tintColor={Colors.textSecondary}
                    />
                    <Text style={styles.addressBadgeText}>
                        {addressCount === 0
                            ? 'Sin direcciones'
                            : addressCount === 1
                                ? '1 dirección'
                                : `${addressCount} direcciones`}
                    </Text>
                </View>
            </View>

            <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={20}
                tintColor={Colors.textSecondary}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: Spacing.sm,
    },
    avatar: {
        marginRight: Spacing.md,
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: Colors.text,
        marginBottom: 2,
    },
    detailText: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 1,
    },
    addressBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 4,
    },
    addressBadgeText: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
});
