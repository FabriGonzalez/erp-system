import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';

import { DateFieldProps } from './date-field-utils';

/** En web, el selector de fecha del navegador (abre su calendario). Mismo aspecto que AppInput. */
export function DateField({ value, onChange, placeholder = 'Elegir fecha', disabled = false, minimumDate }: DateFieldProps) {
    return (
        <input
            type="date"
            value={value}
            min={minimumDate}
            disabled={disabled}
            aria-label={placeholder}
            onChange={(event) => onChange(event.target.value)}
            style={{
                height: 48,
                boxSizing: 'border-box',
                width: '100%',
                border: `1px solid ${Colors.border}`,
                borderRadius: Radius.md,
                padding: `0 ${Spacing.md}px`,
                fontSize: 16,
                fontFamily: 'inherit',
                color: value ? Colors.text : Colors.textSecondary,
                backgroundColor: Colors.surface,
                outline: 'none',
                opacity: disabled ? 0.55 : 1,
            }}
        />
    );
}
