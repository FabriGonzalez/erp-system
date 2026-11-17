import { useLocalSearchParams } from 'expo-router';

import { CustomerAddressForm } from '@/components/customers/CustomerAddressForm';

export default function AddCustomerAddressScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    if (!id) {
        return null;
    }

    return <CustomerAddressForm customerId={id} />;
}