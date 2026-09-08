import { CustomerForm } from '@/components/customers/CustomerForm';
import { useOrderDraftStore } from '@/stores/order-draft-store';

export default function NewOrderCustomerScreen() {
    const setDraftCustomer = useOrderDraftStore(
        (state) => state.setCustomer,
    );

    return (
        <CustomerForm
            onCustomerCreated={setDraftCustomer}
        />
    );
}