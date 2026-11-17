import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { formatDay } from '@/utils/format';

import { DateFieldProps, dateToYmd, ymdToDate } from './date-field-utils';

/**
 * Campo de fecha que abre un calendario: el del sistema en Android y uno debajo del campo en iOS.
 * En web se usa DateField.web.tsx (el selector de fecha del navegador).
 */
export function DateField({ value, onChange, placeholder = 'Elegir fecha', disabled = false, minimumDate }: DateFieldProps) {
    const [isIosPickerVisible, setIosPickerVisible] = useState(false);
    const current = value ? ymdToDate(value) : (minimumDate ? ymdToDate(minimumDate) : new Date());
    const minimum = minimumDate ? ymdToDate(minimumDate) : undefined;

    function open() {
        if (disabled) return;
        if (Platform.OS === 'android') {
            DateTimePickerAndroid.open({
                value: current,
                mode: 'date',
                minimumDate: minimum,
                onChange: (event, date) => {
                    if (event.type === 'set' && date) onChange(dateToYmd(date));
                },
            });
            return;
        }
        setIosPickerVisible((visible) => !visible);
    }

    return (
        <View style={styles.container}>
            <Pressable
                onPress={open}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={value ? `Fecha: ${formatDay(value)}` : placeholder}
                style={({ pressed }) => [styles.field, pressed && styles.pressed, disabled && styles.disabled]}
            >
                <Text style={[styles.text, !value && styles.placeholder]}>
                    {value ? formatDay(value) : placeholder}
                </Text>
                <SymbolView
                    name={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
                    size={20}
                    tintColor={Colors.textSecondary}
                />
            </Pressable>

            {Platform.OS === 'ios' && isIosPickerVisible ? (
                <View style={styles.iosPicker}>
                    <DateTimePicker
                        value={current}
                        mode="date"
                        display="inline"
                        locale="es-AR"
                        minimumDate={minimum}
                        onChange={(_event, date) => {
                            if (date) onChange(dateToYmd(date));
                        }}
                    />
                    <Pressable onPress={() => setIosPickerVisible(false)} style={styles.iosDone} hitSlop={8}>
                        <Text style={styles.iosDoneText}>Listo</Text>
                    </Pressable>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: Spacing.sm,
    },
    field: {
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: Spacing.sm,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        paddingHorizontal: Spacing.md,
        backgroundColor: Colors.surface,
    },
    pressed: {
        backgroundColor: Colors.muted,
    },
    disabled: {
        opacity: 0.55,
    },
    text: {
        fontSize: 16,
        color: Colors.text,
    },
    placeholder: {
        color: Colors.textSecondary,
    },
    iosPicker: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: Radius.md,
        backgroundColor: Colors.surface,
        paddingBottom: Spacing.sm,
    },
    iosDone: {
        alignSelf: 'flex-end',
        paddingHorizontal: Spacing.md,
    },
    iosDoneText: {
        fontSize: 15,
        fontWeight: '700',
        color: Colors.primary,
    },
});
