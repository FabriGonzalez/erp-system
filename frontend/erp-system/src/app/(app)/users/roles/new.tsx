import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RoleForm, toRoleRequest, validateRole } from '@/components/users/RoleForm';
import { AppButton } from '@/components/ui/AppButton';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
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
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={SharedStyles.headerTitle}>Nuevo rol</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

            {isLoading ? (
                <LoadingState label="Cargando permisos..." />
            ) : error ? (
                <ErrorState message={error} onRetry={reload} />
            ) : (
                <>
                    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
                    <View style={styles.footer}>
                        <AppButton
                            title={createRole.isPending ? 'Guardando...' : 'Crear rol'}
                            onPress={() => void handleSave()}
                            disabled={createRole.isPending}
                        />
                    </View>
                </>
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    errorText: {
        color: Colors.error,
        fontSize: 14,
    },
    footer: {
        padding: Spacing.lg,
        backgroundColor: Colors.surface,
        borderTopWidth: 1,
        borderTopColor: Colors.border,
    },
});
