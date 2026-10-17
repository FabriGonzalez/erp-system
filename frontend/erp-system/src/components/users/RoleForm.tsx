import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { RoleRequest } from '@/types/role';
import { groupPermissions, permissionInfo } from '@/utils/permission-labels';

const MAX_CODE_LENGTH = 20;

/** Mismas reglas que RoleRequest en el backend. */
export function validateRole(values: RoleRequest): string | null {
    if (!values.name.trim()) return 'Completá el nombre del rol.';
    if (!values.code.trim()) return 'Completá el código del rol.';
    if (values.permissions.length === 0) return 'Elegí al menos un permiso.';
    return null;
}

/** Limpia los textos antes de mandarlos. */
export function toRoleRequest(values: RoleRequest): RoleRequest {
    const description = values.description?.trim() ?? '';
    return {
        name: values.name.trim(),
        code: values.code.trim(),
        description: description || null,
        permissions: values.permissions,
    };
}

type RoleFormProps = {
    initialValues?: RoleRequest;
    /** Permisos que devuelve el backend. */
    availablePermissions: string[];
    /** Roles de sistema: se muestran sin poder editarse. */
    readOnly?: boolean;
    disabled?: boolean;
    onChange: (values: RoleRequest) => void;
};

const EMPTY: RoleRequest = { name: '', code: '', description: '', permissions: [] };

/**
 * Campos del rol y checklist de permisos. El estado vive acá; cada cambio se informa
 * con onChange para que la pantalla decida cuándo guardar.
 */
export function RoleForm({
    initialValues = EMPTY,
    availablePermissions,
    readOnly = false,
    disabled = false,
    onChange,
}: RoleFormProps) {
    const [values, setValues] = useState<RoleRequest>(initialValues);
    const editable = !readOnly && !disabled;

    function update(next: RoleRequest) {
        setValues(next);
        onChange(next);
    }

    function togglePermission(permission: string) {
        if (!editable) return;
        const selected = values.permissions.includes(permission);
        update({
            ...values,
            permissions: selected
                ? values.permissions.filter((item) => item !== permission)
                : [...values.permissions, permission],
        });
    }

    // Si el rol tiene un permiso que ya no existe en el backend, igual se muestra.
    const allPermissions = Array.from(new Set([...availablePermissions, ...values.permissions]));

    return (
        <View style={styles.container}>
            <View style={styles.field}>
                <Text style={SharedStyles.sectionTitle}>Nombre</Text>
                <AppInput
                    placeholder="Ej. Vendedor"
                    value={values.name}
                    onChangeText={(name) => update({ ...values, name })}
                    maxLength={50}
                    editable={editable}
                />
            </View>

            <View style={styles.field}>
                <Text style={SharedStyles.sectionTitle}>Código</Text>
                <AppInput
                    placeholder="Ej. vendedor"
                    value={values.code}
                    onChangeText={(code) => update({ ...values, code })}
                    autoCorrect={false}
                    maxLength={MAX_CODE_LENGTH}
                    editable={editable}
                />
                <Text style={styles.hint}>Identificador corto y único del rol.</Text>
            </View>

            <View style={styles.field}>
                <Text style={SharedStyles.sectionTitle}>Descripción</Text>
                <AppInput
                    placeholder="Opcional"
                    value={values.description ?? ''}
                    onChangeText={(description) => update({ ...values, description })}
                    maxLength={200}
                    editable={editable}
                />
            </View>

            <View style={styles.field}>
                <Text style={SharedStyles.sectionTitle}>
                    Permisos ({values.permissions.length} de {allPermissions.length})
                </Text>
                {groupPermissions(allPermissions).map((group) => (
                    <View key={group.title} style={styles.group}>
                        <Text style={styles.groupTitle}>{group.title}</Text>
                        {group.permissions.map((permission) => {
                            const selected = values.permissions.includes(permission);
                            const info = permissionInfo(permission);
                            return (
                                <Pressable
                                    key={permission}
                                    onPress={() => togglePermission(permission)}
                                    disabled={!editable}
                                    style={({ pressed }) => [styles.permissionRow, pressed && editable && SharedStyles.pressed]}
                                >
                                    <SymbolView
                                        name={selected
                                            ? { ios: 'checkmark.square.fill', android: 'check_box', web: 'check_box' }
                                            : { ios: 'square', android: 'check_box_outline_blank', web: 'check_box_outline_blank' }}
                                        size={22}
                                        tintColor={selected ? Colors.primary : Colors.textSecondary}
                                    />
                                    <View style={styles.permissionText}>
                                        <Text style={styles.permissionLabel}>{info.label}</Text>
                                        {info.hint && <Text style={styles.hint}>{info.hint}</Text>}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: Spacing.lg,
    },
    field: {
        gap: Spacing.sm,
    },
    hint: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    group: {
        backgroundColor: Colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
        paddingVertical: Spacing.xs,
    },
    groupTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: Colors.text,
        paddingHorizontal: Spacing.md,
        paddingTop: Spacing.sm,
        paddingBottom: Spacing.xs,
    },
    permissionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.sm,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
    },
    permissionText: {
        flex: 1,
        gap: 2,
    },
    permissionLabel: {
        fontSize: 15,
        color: Colors.text,
    },
});
