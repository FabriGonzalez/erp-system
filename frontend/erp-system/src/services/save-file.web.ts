/** Web: descarga la respuesta como archivo con un link temporal. La del celular está en save-file.ts. */
export async function saveResponseAsFile(response: Response, filename: string, mimeType: string): Promise<void> {
    const blob = new Blob([await response.blob()], { type: mimeType });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Firefox cancela la descarga si el link se revoca en el mismo tick del click.
    setTimeout(() => URL.revokeObjectURL(url), 0);
}
