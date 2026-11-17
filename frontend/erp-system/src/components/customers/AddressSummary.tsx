import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { CustomerAddress } from '@/types/customer';
import { getAddressDisplay } from '@/utils/address';

type AddressSummaryProps = {
    address: Pick<
        CustomerAddress,
        'label' | 'street' | 'number' | 'floor' | 'apartment' | 'city' | 'state' | 'postalCode'
    > & Partial<Pick<CustomerAddress, 'isMain' | 'active'>>;
};

/** Título y líneas de una dirección, igual en todas las pantallas que la muestran. */
export function AddressSummary({ address }: AddressSummaryProps) {
    const { title, lines } = getAddressDisplay(address);

    return (
        <View style={styles.container}>
            <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={1}>
                    {title}
                </Text>
                {address.isMain ? (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>Principal</Text>
                    </View>
                ) : null}
                {address.active === false ? (
                    <View style={[styles.badge, styles.inactiveBadge]}>
                        <Text style={[styles.badgeText, styles.inactiveBadgeText]}>Inactiva</Text>
                    </View>
                ) : null}
            </View>
            {lines.map((line, index) => (
                <Text key={index} style={styles.line}>
                    {line}
                </Text>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    title: {
        flexShrink: 1,
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    badge: {
        backgroundColor: Colors.primaryLight,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: Colors.primary,
    },
    inactiveBadge: {
        backgroundColor: Colors.muted,
    },
    inactiveBadgeText: {
        color: Colors.textSecondary,
    },
    line: {
        fontSize: 13,
        color: Colors.textSecondary,
        marginTop: 2,
    },
});
