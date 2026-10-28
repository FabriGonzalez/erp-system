import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Avatar } from '@/components/ui/Avatar';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { SharedStyles } from '@/styles/shared';
import { Customer } from '@/types/customer';
import { getInitials } from '@/utils/format';

type CustomerCardProps = {
    customer: Customer;
    onPress?: () => void;
};

export function CustomerCard({ customer, onPress }: CustomerCardProps) {
    const addressCount = customer.addressCount;
    const contact = [customer.phone, customer.email].filter(Boolean).join(' · ');

    return (
        <Pressable
            style={({ pressed }) => [
                SharedStyles.card,
                SharedStyles.listItem,
                !customer.active && SharedStyles.listItemInactive,
                pressed && SharedStyles.listItemPressed,
            ]}
            onPress={onPress}
            accessibilityRole="button"
        >
            <Avatar
                name={customer.name}
                initials={customer.name ? getInitials(customer.name) : 'C'}
                size={44}
                fontWeight="700"
                fontSize={16}
                backgroundColor={Colors.violetLight}
                textColor={Colors.violet}
            />

            <View style={SharedStyles.listItemTexts}>
                <Text style={SharedStyles.listItemTitle} numberOfLines={1}>{customer.name}</Text>
                {contact ? (
                    <Text style={SharedStyles.listItemMeta} numberOfLines={1}>{contact}</Text>
                ) : null}
                <View style={styles.addressRow}>
                    <SymbolView
                        name={{ ios: 'mappin.and.ellipse', android: 'location_on', web: 'location_on' }}
                        size={12}
                        tintColor={Colors.textSecondary}
                    />
                    <Text style={SharedStyles.listItemMeta}>
                        {addressCount === 0
                            ? 'Sin direcciones'
                            : addressCount === 1
                                ? '1 dirección'
                                : `${addressCount} direcciones`}
                    </Text>
                </View>
            </View>

            {!customer.active ? <StatusPill label="Inactivo" tone="neutral" /> : null}
            <SymbolView
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                size={18}
                tintColor={Colors.textTertiary}
            />
        </Pressable>
    );
}

const styles = StyleSheet.create({
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
});
