import { useLocalSearchParams } from 'expo-router';

import { AddCustomerAddressForm } from '@/components/customers/AddCustomerAddressForm';
import { useCustomerStore } from '@/stores/customer-store';
import { useOrderDraftStore } from '@/stores/order-draft-store';

export default function AddOrderCustomerAddressScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();

    const getCustomerById = useCustomerStore(
        (state) => state.getCustomerById,
    );

    const updateCustomer = useOrderDraftStore(
        (state) => state.updateCustomer,
    );

    if (!id) {
        return null;
    }

    function handleAddressCreated() {
        const updatedCustomer = getCustomerById(id);

        if (updatedCustomer) {
            updateCustomer(updatedCustomer);
        }
    }

    return (
        <AddCustomerAddressForm
            customerId={id}
            onAddressCreated={handleAddressCreated}
        />
    );
}