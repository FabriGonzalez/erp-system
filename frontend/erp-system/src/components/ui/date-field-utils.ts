function pad(value: number) {
    return String(value).padStart(2, '0');
}

/** AAAA-MM-DD → Date a las 0 hs locales (sin corrimiento de zona horaria). */
export function ymdToDate(ymd: string): Date {
    const [year, month, day] = ymd.split('-').map(Number);
    return new Date(year, month - 1, day);
}

/** Date → AAAA-MM-DD con la fecha local. */
export function dateToYmd(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export type DateFieldProps = {
    /** AAAA-MM-DD, o vacío si todavía no se eligió. */
    value: string;
    onChange: (ymd: string) => void;
    placeholder?: string;
    disabled?: boolean;
    /** AAAA-MM-DD: no deja elegir días anteriores. */
    minimumDate?: string;
};
