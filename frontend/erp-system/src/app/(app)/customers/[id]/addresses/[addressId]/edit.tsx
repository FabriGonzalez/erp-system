import { useLocalSearchParams } from 'expo-router';

import { CustomerAddressForm } from '@/components/customers/CustomerAddressForm';
import { NotFound } from '@/components/ui/NotFound';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/utils/permissions';

export default function EditCustomerAddressScreen() {
    const { id, addressId } = useLocalSearchParams<{ id: string; addressId: string }>();
    // El backend permite editar direcciones a quien administra clientes o crea pedidos.
    const canEdit = useAuthStore((state) =>
        hasPermission(state.user, 'ADMINISTRAR_CLIENTES') || hasPermission(state.user, 'CREAR_PEDIDOS'));

    if (!id || !addressId) {
        return null;
    }

    if (!canEdit) {
        return (
            <NotFound
                headerTitle="Editar dirección"
                title="Sin permisos"
                description="Tu usuario no tiene permiso para editar direcciones de clientes."
            />
        );
    }

    return <CustomerAddressForm customerId={id} addressId={addressId} />;
}
