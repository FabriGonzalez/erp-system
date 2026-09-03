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

export function formatCurrency(amount: number): string {
    return `$${amount.toLocaleString('es-AR')}`;
}
