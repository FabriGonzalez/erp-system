import { StyleSheet, Text, View } from 'react-native';

import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';
import { AddressDraft } from '@/utils/address';

type AddressFieldsProps = {
    value: AddressDraft;
    onChange: (next: AddressDraft) => void;
    editable?: boolean;
};

/** Campos de una dirección. Lo usan el alta de cliente y el alta de dirección. */
export function AddressFields({ value, onChange, editable = true }: AddressFieldsProps) {
    function field(name: keyof AddressDraft) {
        return {
            value: value[name],
            onChangeText: (text: string) => onChange({ ...value, [name]: text }),
            editable,
        };
    }

    return (
        <View>
            <View style={styles.field}>
                <Text style={[SharedStyles.fieldLabel, styles.label]}>Etiqueta (opcional)</Text>
                <AppInput placeholder="Ej. Casa, Oficina, Depósito" autoCapitalize="words" maxLength={50} {...field('label')} />
            </View>

            <View style={styles.row}>
                <View style={[styles.field, styles.grow]}>
                    <Text style={[SharedStyles.fieldLabel, styles.label]}>
                        Calle <Text style={styles.required}>*</Text>
                    </Text>
                    <AppInput placeholder="Ej. Av. Colón" autoCapitalize="words" maxLength={150} {...field('street')} />
                </View>
                <View style={[styles.field, styles.small]}>
                    <Text style={[SharedStyles.fieldLabel, styles.label]}>Número</Text>
                    <AppInput placeholder="123" maxLength={20} {...field('number')} />
                </View>
            </View>

            <View style={styles.row}>
                <View style={[styles.field, styles.grow]}>
                    <Text style={[SharedStyles.fieldLabel, styles.label]}>Piso</Text>
                    <AppInput placeholder="Ej. 3" maxLength={20} {...field('floor')} />
                </View>
                <View style={[styles.field, styles.grow]}>
                    <Text style={[SharedStyles.fieldLabel, styles.label]}>Depto.</Text>
                    <AppInput placeholder="Ej. B" maxLength={20} {...field('apartment')} />
                </View>
            </View>

            <View style={styles.field}>
                <Text style={[SharedStyles.fieldLabel, styles.label]}>
                    Ciudad <Text style={styles.required}>*</Text>
                </Text>
                <AppInput placeholder="Ej. Bahía Blanca" autoCapitalize="words" maxLength={100} {...field('city')} />
            </View>

            <View style={styles.row}>
                <View style={[styles.field, styles.grow]}>
                    <Text style={[SharedStyles.fieldLabel, styles.label]}>Provincia</Text>
                    <AppInput placeholder="Ej. Buenos Aires" autoCapitalize="words" maxLength={100} {...field('state')} />
                </View>
                <View style={[styles.field, styles.small]}>
                    <Text style={[SharedStyles.fieldLabel, styles.label]}>C.P.</Text>
                    <AppInput placeholder="8000" autoCapitalize="characters" maxLength={20} {...field('postalCode')} />
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    field: {
        marginBottom: Spacing.md,
    },
    label: {
        marginBottom: Spacing.xs + 2,
    },
    required: {
        color: Colors.error,
    },
    row: {
        flexDirection: 'row',
        gap: Spacing.md,
    },
    grow: {
        flex: 1,
    },
    small: {
        width: 110,
    },
});
