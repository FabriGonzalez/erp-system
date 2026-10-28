import { Colors } from './colors';

/**
 * Color de un ícono, un contador o una píldora según lo que indica. Siempre el mismo
 * significado en toda la app: ámbar = rápido o pendiente, verde = listo, rojo = falta o peligro.
 */
export type Tone = 'primary' | 'warning' | 'success' | 'danger' | 'teal' | 'violet' | 'rose' | 'neutral';

export const ToneColors: Record<Tone, { background: string; foreground: string }> = {
    primary: { background: Colors.primaryLight, foreground: Colors.primary },
    warning: { background: Colors.warningLight, foreground: Colors.warningTextSecondary },
    success: { background: Colors.successLight, foreground: Colors.successDark },
    danger: { background: Colors.errorSoft, foreground: Colors.errorDark },
    teal: { background: Colors.tealLight, foreground: Colors.teal },
    violet: { background: Colors.violetLight, foreground: Colors.violet },
    rose: { background: Colors.roseLight, foreground: Colors.rose },
    neutral: { background: Colors.muted, foreground: Colors.slate },
};
