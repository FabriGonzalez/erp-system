import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { Customer } from '@/types/customer';

type CustomerCardProps = {
    customer: Customer;
    onPress?: () => void;
};

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
    const addressCount = customer.addresses.length;

    return (
        <Pressable
            style={({ pressed }) => [styles.card, pressed && SharedStyles.pressed]}
            onPress={onPress}
        >
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                    {customer.name
                        ? customer.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .slice(0, 2)
                            .toUpperCase()
                        : 'C'}
                </Text>
            </View>

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
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.surface,
        borderRadius: 12,
        padding: Spacing.md,
        borderWidth: 1,
        borderColor: Colors.border,
        marginBottom: Spacing.sm,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#EFF6FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: Spacing.md,
    },
    avatarText: {
        color: Colors.primary,
        fontSize: 16,
        fontWeight: '700',
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
