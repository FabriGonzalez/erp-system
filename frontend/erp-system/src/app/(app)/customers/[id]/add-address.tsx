import { useLocalSearchParams } from 'expo-router';

import { AddCustomerAddressForm } from '@/components/customers/AddCustomerAddressForm';

export default function AddCustomerAddressScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    if (!id) {
        return null;
    }

    return <AddCustomerAddressForm customerId={id} />;
}