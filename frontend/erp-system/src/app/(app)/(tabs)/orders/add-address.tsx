import { useLocalSearchParams } from 'expo-router';

import { AddCustomerAddressForm } from '@/components/customers/AddCustomerAddressForm';
import { useOrderDraftStore } from '@/stores/order-draft-store';

export default function AddOrderCustomerAddressScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const setDraftAddress = useOrderDraftStore((state) => state.setAddress);

    if (!id) {
        return null;
    }

    // El cliente del borrador ya se actualiza desde el formulario; acá solo se elige
    // la dirección recién creada, que es para la que se la cargó.
    return (
        <AddCustomerAddressForm
            customerId={id}
            onAddressCreated={setDraftAddress}
        />
    );
}
