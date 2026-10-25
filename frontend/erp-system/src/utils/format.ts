export function getInitials(name: string): string {
    return name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
}

export function formatDateTime(iso: string): string {
    const date = new Date(iso);

    return (
        date.toLocaleDateString('es-AR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }) +
        ' · ' +
        date.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
        })
    );
}

/** Solo la hora local, p. ej. "15:30". */
export function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

export function formatCurrency(amount: number): string {
    return `$${amount.toLocaleString('es-AR')}`;
}

export function formatDate(iso: string): string {
    const date = new Date(iso);
    return date.toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

/**
 * Fecha sin hora del backend (AAAA-MM-DD). new Date() la tomaría como medianoche UTC y en
 * Argentina mostraría el día anterior: se arma en hora local.
 */
export function formatDay(ymd: string): string {
    const [year, month, day] = ymd.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es-AR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}
