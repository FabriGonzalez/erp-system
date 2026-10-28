import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { RoleForm, toRoleRequest, validateRole } from '@/components/users/RoleForm';
import { AppButton } from '@/components/ui/AppButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { FormFooter } from '@/components/ui/FormFooter';
import { ListGroup } from '@/components/ui/ListGroup';
import { LoadingState } from '@/components/ui/LoadingState';
import { MenuListItem } from '@/components/ui/MenuListItem';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import {
    useAssignablePermissions,
    useRole,
    useSetRoleActive,
    useUpdateRole,
} from '@/hooks/use-role-queries';
import { SharedStyles } from '@/styles/shared';
import { RoleRequest } from '@/types/role';
import { confirmAction } from '@/utils/confirm';

export default function RoleDetailScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const { role, isLoading, error, reload } = useRole(id);
    const permissions = useAssignablePermissions();
    const updateRole = useUpdateRole(id);
    const setActive = useSetRoleActive(id);
    // Null mientras no se tocó nada: así "Guardar" solo aparece habilitado con cambios.
    const [draft, setDraft] = useState<RoleRequest | null>(null);
    const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

    const isBusy = updateRole.isPending || setActive.isPending;

    async function handleSave() {
        if (!draft || isBusy) return;
        const validationError = validateRole(draft);
        if (validationError) {
            setMessage({ text: validationError, isError: true });
            return;
        }

        setMessage(null);
        try {
            await updateRole.mutateAsync(toRoleRequest(draft));
            setDraft(null);
            setMessage({ text: 'Rol guardado. Los usuarios con este rol ya tienen los permisos nuevos.', isError: false });
        } catch (err) {
            setMessage({ text: err instanceof Error ? err.message : 'No se pudo guardar el rol.', isError: true });
        }
    }

    async function handleToggleActive() {
        if (!role || isBusy) return;
        const activate = !role.active;
        const confirmed = await confirmAction({
            title: activate ? 'Activar rol' : 'Desactivar rol',
            message: activate
                ? 'Los usuarios con este rol recuperan sus permisos y se lo puede volver a asignar.'
                : 'Los usuarios con este rol se quedan sin permisos hasta que les asignes otro.',
            confirmLabel: activate ? 'Activar' : 'Desactivar',
            destructive: !activate,
        });
        if (!confirmed) return;

        setMessage(null);
        try {
            await setActive.mutateAsync(activate);
        } catch (err) {
            setMessage({ text: err instanceof Error ? err.message : 'No se pudo actualizar el rol.', isError: true });
        }
    }

    function renderBody() {
        if (isLoading || permissions.isLoading) return <LoadingState label="Cargando rol..." />;
        if (!role) return <ErrorState message={error ?? 'No se encontró el rol.'} onRetry={reload} />;
        if (permissions.error) return <ErrorState message={permissions.error} onRetry={permissions.reload} />;

        return (
            <>
                <ScrollView contentContainerStyle={SharedStyles.pageContent} keyboardShouldPersistTaps="handled">
                    {role.system && (
                        <View style={styles.notice}>
                            <Text style={styles.noticeText}>
                                Rol del sistema: tiene todos los permisos y no se puede modificar ni desactivar.
                            </Text>
                        </View>
                    )}
                    {!role.active && (
                        <View style={styles.notice}>
                            <Text style={styles.noticeText}>
                                Rol inactivo: sus usuarios no tienen permisos y no se puede asignar.
                            </Text>
                        </View>
                    )}

                    <RoleForm
                        key={role.id}
                        initialValues={{
                            name: role.name,
                            code: role.code,
                            description: role.description,
                            permissions: role.permissions,
                        }}
                        availablePermissions={permissions.permissions}
                        readOnly={role.system}
                        disabled={isBusy}
                        onChange={(next) => {
                            setDraft(next);
                            setMessage(null);
                        }}
                    />

                    {message && (
                        <Text style={message.isError ? styles.errorText : styles.successText}>{message.text}</Text>
                    )}

                    {!role.system && (
                        <ListGroup>
                            <MenuListItem
                                title={role.active ? 'Desactivar rol' : 'Activar rol'}
                                subtitle={role.active
                                    ? 'Sus usuarios se quedan sin permisos'
                                    : 'Sus usuarios recuperan los permisos'}
                                iconName={role.active
                                    ? { ios: 'pause.circle', android: 'block', web: 'block' }
                                    : { ios: 'play.circle', android: 'check_circle', web: 'check_circle' }}
                                tone="success"
                                danger={role.active}
                                showChevron={false}
                                onPress={() => void handleToggleActive()}
                            />
                        </ListGroup>
                    )}
                </ScrollView>

                {!role.system && (
                    <FormFooter>
                        <AppButton
                            title={updateRole.isPending ? 'Guardando...' : 'Guardar cambios'}
                            onPress={() => void handleSave()}
                            disabled={!draft || isBusy}
                        />
                    </FormFooter>
                )}
            </>
        );
    }

    return (
        <Screen style={styles.screen}>
            <PageHeader onBack={() => router.back()} eyebrow="Rol" title={role?.name ?? 'Rol'} />

            {renderBody()}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    notice: {
        backgroundColor: Colors.primaryLight,
        borderRadius: Radius.md,
        padding: Spacing.md,
    },
    noticeText: {
        fontSize: 14,
        color: Colors.primary,
    },
    errorText: {
        color: Colors.error,
        fontSize: 14,
    },
    successText: {
        color: Colors.successDark,
        fontSize: 14,
    },
});
