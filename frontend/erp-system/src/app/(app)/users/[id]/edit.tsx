import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { UserForm } from '@/components/users/UserForm';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useRoles } from '@/hooks/use-role-queries';
import { useCompanyUser, useUpdateUser } from '@/hooks/use-user-queries';
import { useAuthStore } from '@/stores/auth-store';

export default function EditUserScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const currentUserId = useAuthStore((state) => state.user?.id);
    const { user, isLoading, error, reload } = useCompanyUser(id);
    const { roles, isLoading: isLoadingRoles } = useRoles();
    const updateUser = useUpdateUser(id);
    const [submitError, setSubmitError] = useState<string | null>(null);

    if (isLoading || isLoadingRoles) return <LoadingState label="Cargando usuario..." />;
    if (!user) return <ErrorState message={error ?? 'No se encontró el usuario.'} onRetry={reload} />;

    const isMe = user.id === currentUserId;
    // Solo se asignan roles activos; el propio rol se muestra aunque esté desactivado.
    const selectableRoles = roles.filter((role) => role.active || (isMe && role.id === user.roleId));

    return (
        <UserForm
            mode="edit"
            initialValues={{
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roleId: user.roleId ?? '',
            }}
            roles={selectableRoles}
            roleLocked={isMe}
            isSubmitting={updateUser.isPending}
            submitError={submitError}
            onSubmit={async ({ password: _password, ...values }) => {
                setSubmitError(null);
                try {
                    await updateUser.mutateAsync(values);
                    router.back();
                } catch (err) {
                    setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar el usuario.');
                }
            }}
        />
    );
}
