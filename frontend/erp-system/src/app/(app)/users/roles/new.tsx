import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { RoleForm, toRoleRequest, validateRole } from '@/components/users/RoleForm';
import { AppButton } from '@/components/ui/AppButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormFooter } from '@/components/ui/FormFooter';
import { LoadingState } from '@/components/ui/LoadingState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { useAssignablePermissions, useCreateRole } from '@/hooks/use-role-queries';
import { SharedStyles } from '@/styles/shared';
import { RoleRequest } from '@/types/role';

export default function NewRoleScreen() {
    const { permissions, isLoading, error, reload } = useAssignablePermissions();
    const createRole = useCreateRole();
    const [values, setValues] = useState<RoleRequest>({ name: '', code: '', description: '', permissions: [] });
    const [formError, setFormError] = useState<string | null>(null);

    async function handleSave() {
        if (createRole.isPending) return;
        const validationError = validateRole(values);
        if (validationError) {
            setFormError(validationError);
            return;
        }

        setFormError(null);
        try {
            const role = await createRole.mutateAsync(toRoleRequest(values));
            router.replace({ pathname: '/users/roles/[id]', params: { id: role.id } });
        } catch (err) {
            setFormError(err instanceof Error ? err.message : 'No se pudo crear el rol.');
        }
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader onBack={() => router.back()} eyebrow="Roles" title="Nuevo rol" />

            {isLoading ? (
                <LoadingState label="Cargando permisos..." />
            ) : error ? (
                <ErrorState message={error} onRetry={reload} />
            ) : (
                <>
                    <ScrollView contentContainerStyle={SharedStyles.pageContent} keyboardShouldPersistTaps="handled">
                        <RoleForm
                            availablePermissions={permissions}
                            disabled={createRole.isPending}
                            onChange={(next) => {
                                setValues(next);
                                setFormError(null);
                            }}
                        />
                        {formError && <Text style={styles.errorText}>{formError}</Text>}
                    </ScrollView>
                    <FormFooter>
                        <AppButton
                            title={createRole.isPending ? 'Guardando...' : 'Crear rol'}
                            onPress={() => void handleSave()}
                            disabled={createRole.isPending}
                        />
                    </FormFooter>
                </>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    errorText: {
        color: Colors.error,
        fontSize: 14,
    },
});
