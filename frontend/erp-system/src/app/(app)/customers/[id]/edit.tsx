import { useLocalSearchParams } from 'expo-router';

import { CustomerForm } from '@/components/customers/CustomerForm';
import { LoadingState } from '@/components/ui/LoadingState';
import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { useCustomer } from '@/hooks/use-customer-queries';
import { useAuthStore } from '@/stores/auth-store';
import { hasPermission } from '@/utils/permissions';

export default function EditCustomerScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const canEdit = useAuthStore((state) => hasPermission(state.user, 'ADMINISTRAR_CLIENTES'));
    const { customer, isLoading } = useCustomer(id);

    if (!canEdit) {
        return (
            <NotFound
                headerTitle="Editar cliente"
                title="Sin permisos"
                description="Tu usuario no tiene permiso para editar clientes."
            />
        );
    }

    if (!customer && isLoading) {
        return (
            <Screen>
                <LoadingState label="Cargando cliente..." />
            </Screen>
        );
    }

    if (!customer) {
        return (
            <NotFound
                headerTitle="Editar cliente"
                title="Cliente no encontrado"
                description="El cliente que querés editar no existe o ya no está disponible."
            />
        );
    }

    // key: si cambia el cliente, el formulario se vuelve a inicializar con sus datos.
    return <CustomerForm key={customer.id} customer={customer} />;
}
