import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NotFound } from '@/components/ui/NotFound';
import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useDownloadImportTemplate, useImportProducts, usePreviewProductImport } from '@/hooks/use-import-queries';
import { errorText } from '@/hooks/use-paged-list';
import { useAuthStore } from '@/stores/auth-store';
import { showErrorToast, showToast } from '@/stores/toast-store';
import { SharedStyles } from '@/styles/shared';
import { ImportFile, ProductImportAction, ProductImportResult, ProductImportRow } from '@/types/product-import';
import { confirmAction } from '@/utils/confirm';
import { hasPermission } from '@/utils/permissions';

const ACCEPTED_TYPES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
    'text/comma-separated-values',
    'application/csv',
    'text/plain',
];

// Más filas a la vez hacen lenta la pantalla; las de error van primero.
const MAX_VISIBLE_ROWS = 200;

const ACTION_ORDER: Record<ProductImportAction, number> = { ERROR: 0, UPDATE: 1, CREATE: 2, UNCHANGED: 3 };

const ACTION_BADGES: Record<ProductImportAction, { label: string; background: string; color: string }> = {
    ERROR: { label: 'Error', background: Colors.errorSoft, color: Colors.errorDark },
    CREATE: { label: 'Nuevo', background: Colors.successLight, color: Colors.successDark },
    UPDATE: { label: 'Actualiza', background: Colors.primaryLight, color: Colors.primaryDark },
    UNCHANGED: { label: 'Sin cambios', background: Colors.muted, color: Colors.textSecondary },
};

function plural(count: number, singular: string, pluralForm: string) {
    return `${count} ${count === 1 ? singular : pluralForm}`;
}

function summaryOf(result: ProductImportResult) {
    const parts: string[] = [];
    if (result.productsToCreate > 0) {
        parts.push(`se crean ${plural(result.productsToCreate, 'producto', 'productos')} (${plural(result.variantsToCreate, 'variante', 'variantes')})`);
    }
    if (result.variantsToUpdate > 0) {
        parts.push(`se actualizan ${plural(result.variantsToUpdate, 'variante', 'variantes')}`);
    }
    return parts.join(' y ');
}

export default function ImportProductsScreen() {
    const canImport = useAuthStore((state) => hasPermission(state.user, 'ADMINISTRAR_PRODUCTOS'));
    const downloadTemplate = useDownloadImportTemplate();
    const preview = usePreviewProductImport();
    const importMutation = useImportProducts();

    const [file, setFile] = useState<ImportFile | null>(null);
    const [result, setResult] = useState<ProductImportResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [lastImport, setLastImport] = useState<string | null>(null);
    const [showUnchanged, setShowUnchanged] = useState(false);
    // Cada archivo nuevo deja sin efecto la respuesta de uno anterior que termine tarde.
    const requestRef = useRef(0);

    if (!canImport) {
        return (
            <NotFound
                headerTitle="Importar productos"
                title="Sin permisos"
                description='Importar productos requiere el permiso "Administrar productos".'
            />
        );
    }

    const isBusy = preview.isPending || importMutation.isPending;
    const pendingChanges = result ? result.variantsToCreate + result.variantsToUpdate : 0;
    const canConfirm = Boolean(file && result?.valid && pendingChanges > 0) && !isBusy;

    async function handleDownloadTemplate() {
        try {
            await downloadTemplate.mutateAsync();
        } catch (downloadError) {
            showErrorToast(downloadError, 'No se pudo descargar la plantilla.');
        }
    }

    async function handlePickFile() {
        const picked = await DocumentPicker.getDocumentAsync({
            type: ACCEPTED_TYPES,
            copyToCacheDirectory: true,
            base64: false,
        });
        if (picked.canceled || !picked.assets?.length) return;

        const asset = picked.assets[0];
        const next: ImportFile = {
            name: asset.name,
            uri: asset.uri,
            mimeType: asset.mimeType,
            size: asset.size,
            file: asset.file,
        };
        const request = ++requestRef.current;
        setFile(next);
        setResult(null);
        setError(null);
        setLastImport(null);
        setShowUnchanged(false);

        try {
            const previewResult = await preview.mutateAsync(next);
            if (request === requestRef.current) setResult(previewResult);
        } catch (previewError) {
            if (request === requestRef.current) setError(errorText(previewError));
        }
    }

    async function handleConfirm() {
        if (!file || !result) return;
        const confirmed = await confirmAction({
            title: 'Importar productos',
            message: `Con este archivo ${summaryOf(result)}. Se guarda todo junto.`,
            confirmLabel: 'Importar',
        });
        if (!confirmed) return;

        const request = ++requestRef.current;
        try {
            const importResult = await importMutation.mutateAsync(file);
            if (request !== requestRef.current) return;
            if (importResult.applied) {
                const summary = summaryOf(importResult);
                showToast({ type: 'success', message: 'Importación lista.' });
                setLastImport(summary.charAt(0).toUpperCase() + summary.slice(1) + '.');
                setFile(null);
                setResult(null);
            } else {
                // Algo cambió entre la vista previa y la confirmación (p. ej. otro usuario usó un SKU).
                setResult(importResult);
                setError('Los datos cambiaron desde la vista previa y no se guardó nada. Revisá los errores.');
            }
        } catch (importError) {
            if (request === requestRef.current) setError(errorText(importError));
        }
    }

    const rows = result
        ? [...result.rows]
            .filter((row) => showUnchanged || row.action !== 'UNCHANGED')
            .sort((left, right) => ACTION_ORDER[left.action] - ACTION_ORDER[right.action] || left.row - right.row)
        : [];
    const visibleRows = rows.slice(0, MAX_VISIBLE_ROWS);

    return (
        <Screen style={styles.screen}>
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [SharedStyles.backButton, pressed && SharedStyles.pressed]}
                    disabled={importMutation.isPending}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={SharedStyles.headerTitle}>Importar productos</Text>
                <View style={SharedStyles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {lastImport ? (
                    <View style={styles.successBox}>
                        <Text style={styles.successTitle}>Importación lista</Text>
                        <Text style={styles.successText}>{lastImport}</Text>
                    </View>
                ) : null}

                <View style={styles.card}>
                    <Text style={styles.stepTitle}>1. Descargá la plantilla</Text>
                    <Text style={styles.hint}>
                        Trae las columnas, los atributos de tu catálogo y una columna de stock por sucursal. En la
                        hoja &quot;Instrucciones&quot; está cómo completarla. También podés subir tu propio Excel si
                        usa los mismos encabezados.
                    </Text>
                    <Pressable
                        style={({ pressed }) => [styles.secondaryButton, pressed && SharedStyles.pressed]}
                        onPress={handleDownloadTemplate}
                        disabled={downloadTemplate.isPending}
                    >
                        {downloadTemplate.isPending
                            ? <ActivityIndicator color={Colors.primary} />
                            : <Text style={styles.secondaryButtonText}>Descargar plantilla</Text>}
                    </Pressable>
                </View>

                <View style={styles.card}>
                    <Text style={styles.stepTitle}>2. Elegí el archivo</Text>
                    <Text style={styles.hint}>
                        Excel (.xlsx o .xls) o .csv, hasta 2 MB y 5.000 filas. Antes de guardar vas a ver qué pasa
                        con cada fila.
                    </Text>
                    {file ? <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text> : null}
                    <Pressable
                        style={({ pressed }) => [styles.secondaryButton, pressed && SharedStyles.pressed, isBusy && styles.disabled]}
                        onPress={handlePickFile}
                        disabled={isBusy}
                    >
                        {preview.isPending
                            ? <ActivityIndicator color={Colors.primary} />
                            : <Text style={styles.secondaryButtonText}>{file ? 'Elegir otro archivo' : 'Elegir archivo'}</Text>}
                    </Pressable>
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {result ? (
                    <View style={styles.card}>
                        <Text style={styles.stepTitle}>3. Revisá y confirmá</Text>

                        {result.fileErrors.length > 0 ? (
                            <View style={styles.errorBox}>
                                {result.fileErrors.map((fileError) => (
                                    <Text key={fileError} style={styles.errorText}>• {fileError}</Text>
                                ))}
                            </View>
                        ) : (
                            <>
                                <View style={styles.counters}>
                                    <Counter label="Productos nuevos" value={result.productsToCreate} />
                                    <Counter label="Variantes nuevas" value={result.variantsToCreate} />
                                    <Counter label="A actualizar" value={result.variantsToUpdate} />
                                    <Counter label="Sin cambios" value={result.variantsUnchanged} />
                                    <Counter label="Con errores" value={result.rowsWithErrors} danger />
                                </View>

                                {result.categoriesToCreate.length > 0 ? (
                                    <CatalogList title="Categorías que se van a crear" items={result.categoriesToCreate} />
                                ) : null}
                                {result.attributesToCreate.length > 0 ? (
                                    <CatalogList
                                        title="Atributos y valores que se van a crear"
                                        items={result.attributesToCreate}
                                        hint="Cada columna que no es de las fijas ni de stock se toma como atributo. Si alguna no lo es (Costo, Proveedor…), borrala del archivo."
                                    />
                                ) : null}

                                {result.rowsWithErrors > 0 ? (
                                    <Text style={styles.warningText}>
                                        Corregí las filas con errores en el archivo y volvé a elegirlo: no se guarda nada
                                        hasta que esté todo bien.
                                    </Text>
                                ) : null}

                                <Pressable
                                    style={({ pressed }) => [styles.primaryButton, pressed && SharedStyles.pressed, !canConfirm && styles.disabled]}
                                    onPress={handleConfirm}
                                    disabled={!canConfirm}
                                >
                                    {importMutation.isPending
                                        ? <ActivityIndicator color={Colors.white} />
                                        : <Text style={styles.primaryButtonText}>
                                            {pendingChanges > 0 || !result.valid ? 'Importar' : 'No hay cambios para importar'}
                                        </Text>}
                                </Pressable>

                                {result.variantsUnchanged > 0 ? (
                                    <Pressable onPress={() => setShowUnchanged((current) => !current)}>
                                        <Text style={styles.link}>
                                            {showUnchanged ? 'Ocultar filas sin cambios' : 'Mostrar también las filas sin cambios'}
                                        </Text>
                                    </Pressable>
                                ) : null}

                                <View style={styles.rows}>
                                    {visibleRows.map((row) => <ImportRowCard key={row.row} row={row} />)}
                                </View>
                                {rows.length > visibleRows.length ? (
                                    <Text style={styles.hint}>
                                        Se muestran {visibleRows.length} de {rows.length} filas (primero las que tienen errores).
                                    </Text>
                                ) : null}
                            </>
                        )}
                    </View>
                ) : null}
            </ScrollView>
        </Screen>
    );
}

function Counter({ label, value, danger = false }: { label: string; value: number; danger?: boolean }) {
    return (
        <View style={[styles.counter, danger && value > 0 && styles.counterDanger]}>
            <Text style={[styles.counterValue, danger && value > 0 && styles.counterValueDanger]}>{value}</Text>
            <Text style={styles.counterLabel}>{label}</Text>
        </View>
    );
}

function CatalogList({ title, items, hint }: { title: string; items: string[]; hint?: string }) {
    return (
        <View style={styles.catalogList}>
            <Text style={styles.catalogTitle}>{title}</Text>
            {items.map((item) => <Text key={item} style={styles.catalogItem}>• {item}</Text>)}
            {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
    );
}

function ImportRowCard({ row }: { row: ProductImportRow }) {
    const badge = ACTION_BADGES[row.action];
    return (
        <View style={[styles.rowCard, row.action === 'ERROR' && styles.rowCardError]}>
            <View style={styles.rowHeader}>
                <Text style={styles.rowNumber}>Fila {row.row}</Text>
                <View style={[styles.badge, { backgroundColor: badge.background }]}>
                    <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                </View>
            </View>
            <Text style={styles.rowProduct} numberOfLines={1}>{row.product ?? 'Sin nombre'}</Text>
            {row.sku ? <Text style={styles.rowSku}>{row.sku}</Text> : null}
            {row.errors.map((message) => <Text key={message} style={styles.rowError}>• {message}</Text>)}
            {row.warnings.map((message) => <Text key={message} style={styles.rowWarning}>• {message}</Text>)}
            {row.changes.map((message) => <Text key={message} style={styles.rowChange}>• {message}</Text>)}
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        padding: 0,
    },
    content: {
        padding: Spacing.lg,
        gap: Spacing.md,
    },
    card: {
        ...SharedStyles.card,
        gap: Spacing.sm,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: Colors.text,
    },
    hint: {
        fontSize: 13,
        color: Colors.textSecondary,
        lineHeight: 18,
    },
    fileName: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text,
    },
    secondaryButton: {
        ...SharedStyles.buttonSecondary,
        flex: 0,
    },
    secondaryButtonText: SharedStyles.buttonSecondaryText,
    primaryButton: {
        ...SharedStyles.buttonPrimary,
        flex: 0,
    },
    primaryButtonText: SharedStyles.buttonPrimaryText,
    disabled: {
        opacity: 0.5,
    },
    link: {
        color: Colors.primary,
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
        paddingVertical: Spacing.xs,
    },
    successBox: {
        backgroundColor: Colors.successLight,
        borderColor: Colors.successBorder,
        borderWidth: 1,
        borderRadius: 12,
        padding: Spacing.md,
        gap: Spacing.xs,
    },
    successTitle: {
        color: Colors.successDark,
        fontSize: 15,
        fontWeight: '700',
    },
    successText: {
        color: Colors.successDark,
        fontSize: 14,
    },
    errorBox: {
        backgroundColor: Colors.errorLight,
        borderColor: Colors.errorBorder,
        borderWidth: 1,
        borderRadius: 12,
        padding: Spacing.md,
        gap: Spacing.xs,
    },
    errorText: {
        color: Colors.errorDark,
        fontSize: 14,
    },
    warningText: {
        color: Colors.warningText,
        fontSize: 13,
        lineHeight: 18,
    },
    counters: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    counter: {
        minWidth: 96,
        flexGrow: 1,
        backgroundColor: Colors.muted,
        borderRadius: 10,
        padding: Spacing.sm,
        alignItems: 'center',
    },
    counterDanger: {
        backgroundColor: Colors.errorSoft,
    },
    counterValue: {
        fontSize: 20,
        fontWeight: '700',
        color: Colors.text,
    },
    counterValueDanger: {
        color: Colors.errorDark,
    },
    counterLabel: {
        fontSize: 12,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    catalogList: {
        backgroundColor: Colors.warningLight,
        borderRadius: 10,
        padding: Spacing.md,
        gap: 2,
    },
    catalogTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.warningText,
        marginBottom: Spacing.xs,
    },
    catalogItem: {
        fontSize: 13,
        color: Colors.warningText,
    },
    rows: {
        gap: Spacing.sm,
    },
    rowCard: {
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        padding: Spacing.md,
        gap: 2,
        backgroundColor: Colors.surface,
    },
    rowCardError: {
        borderColor: Colors.errorBorder,
        backgroundColor: Colors.errorInput,
    },
    rowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rowNumber: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    badge: {
        borderRadius: 999,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 2,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
    },
    rowProduct: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.text,
    },
    rowSku: {
        fontSize: 12,
        color: Colors.textSecondary,
    },
    rowError: {
        fontSize: 13,
        color: Colors.errorDark,
    },
    rowWarning: {
        fontSize: 13,
        color: Colors.warningText,
    },
    rowChange: {
        fontSize: 13,
        color: Colors.primaryDark,
    },
});
