import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

/**
 * Celular: guarda la respuesta en la caché y abre el menú de compartir (Drive, mail, WhatsApp…)
 * para que el usuario se la lleve a la PC. La versión web está en save-file.web.ts.
 */
export async function saveResponseAsFile(response: Response, filename: string, mimeType: string): Promise<void> {
    const base64 = await blobToBase64(await response.blob());

    const file = new File(Paths.cache, filename);
    file.create({ overwrite: true });
    file.write(base64, { encoding: 'base64' });

    if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Este dispositivo no permite compartir archivos.');
    }
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename });
}

// FileReader.readAsDataURL es la lectura binaria que implementa React Native.
function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = String(reader.result);
            resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
        };
        reader.onerror = () => reject(new Error('No se pudo leer el archivo descargado.'));
        reader.readAsDataURL(blob);
    });
}
