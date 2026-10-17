import { router } from 'expo-router';
import { useState } from 'react';

import { UserForm } from '@/components/users/UserForm';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useRoles } from '@/hooks/use-role-queries';
import { useCreateUser } from '@/hooks/use-user-queries';

export default function NewUserScreen() {
    const { roles, isLoading, error, reload } = useRoles();
    const createUser = useCreateUser();
    const [submitError, setSubmitError] = useState<string | null>(null);

    if (isLoading) return <LoadingState label="Cargando roles..." />;
    if (error && roles.length === 0) return <ErrorState message={error} onRetry={reload} />;

    return (
        <UserForm
            mode="create"
            roles={roles.filter((role) => role.active)}
            isSubmitting={createUser.isPending}
            submitError={submitError}
            onSubmit={async (values) => {
                setSubmitError(null);
                try {
                    const user = await createUser.mutateAsync(values);
                    // A la ficha, donde se le asignan las sucursales.
                    router.replace({ pathname: '/users/[id]', params: { id: user.id } });
                } catch (err) {
                    setSubmitError(err instanceof Error ? err.message : 'No se pudo crear el usuario.');
                }
            }}
        />
    );
}
