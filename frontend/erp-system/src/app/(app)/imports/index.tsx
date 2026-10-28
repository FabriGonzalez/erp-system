import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ActionCard } from '@/components/ui/ActionCard';
import { AppButton } from '@/components/ui/AppButton';
import { IconBadge } from '@/components/ui/IconBadge';
import { NotFound } from '@/components/ui/NotFound';
import { PageHeader } from '@/components/ui/PageHeader';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { StatusPill } from '@/components/ui/StatusPill';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { Tone } from '@/constants/tones';
import {
    useDownloadImportTemplate,
    useExportProducts,
    useImportProducts,
    usePreviewProductImport,
} from '@/hooks/use-import-queries';
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

const ACTION_BADGES: Record<ProductImportAction, { label: string; tone: Tone }> = {
    ERROR: { label: 'Error', tone: 'danger' },
    CREATE: { label: 'Nuevo', tone: 'success' },
    UPDATE: { label: 'Actualiza', tone: 'primary' },
    UNCHANGED: { label: 'Sin cambios', tone: 'neutral' },
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
    const exportCatalog = useExportProducts();
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
        if (downloadTemplate.isPending) return;
        try {
            await downloadTemplate.mutateAsync();
        } catch (downloadError) {
            showErrorToast(downloadError, 'No se pudo descargar la plantilla.');
        }
    }

    async function handleExport() {
        if (exportCatalog.isPending) return;
        try {
            await exportCatalog.mutateAsync();
        } catch (exportError) {
            showErrorToast(exportError, 'No se pudo exportar el catálogo.');
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
        <Screen>
            <PageHeader
                title="Importar productos"
                eyebrow="Productos desde Excel"
                // Mientras se guarda no se sale: el resultado se vería en otra pantalla.
                onBack={importMutation.isPending ? undefined : () => router.back()}
            />

            <ScrollView contentContainerStyle={SharedStyles.pageContent} showsVerticalScrollIndicator={false}>
                {lastImport ? (
                    <View style={styles.successBox}>
                        <Text style={styles.successTitle}>Importación lista</Text>
                        <Text style={styles.successText}>{lastImport}</Text>
                    </View>
                ) : null}

                <View style={SharedStyles.pageSection}>
                    <SectionHeader title="1 · Bajá un Excel" />
                    <View style={styles.tiles}>
                        <View style={styles.tile}>
                            <ActionCard
                                icon={{ ios: 'doc.badge.plus', android: 'note_add', web: 'note_add' }}
                                title="Plantilla vacía"
                                subtitle="Para cargar productos nuevos. Trae tus atributos y una columna de stock por sucursal."
                                onPress={handleDownloadTemplate}
                                right={<DownloadIcon loading={downloadTemplate.isPending} />}
                            />
                        </View>
                        <View style={styles.tile}>
                            <ActionCard
                                icon={{ ios: 'tablecells', android: 'table_view', web: 'table_view' }}
                                tone="success"
                                title="Mi catálogo"
                                subtitle="Tus productos activos, para cambiar precios, códigos o stock en Excel y volver a subirlo."
                                onPress={handleExport}
                                right={<DownloadIcon loading={exportCatalog.isPending} />}
                            />
                        </View>
                    </View>
                    <Text style={styles.hint}>
                        También podés subir tu propio Excel si usa los mismos encabezados. En la hoja
                        &quot;Instrucciones&quot; está cómo completarlo.
                    </Text>
                </View>

                <View style={SharedStyles.pageSection}>
                    <SectionHeader title="2 · Subilo" />
                    <Pressable
                        style={({ pressed }) => [
                            styles.dropZone,
                            file && styles.dropZoneSelected,
                            pressed && SharedStyles.pressed,
                            isBusy && styles.disabled,
                        ]}
                        onPress={handlePickFile}
                        disabled={isBusy}
                        accessibilityRole="button"
                    >
                        {preview.isPending ? (
                            <>
                                <ActivityIndicator color={Colors.primary} />
                                <Text style={styles.dropZoneTitle}>Leyendo el archivo…</Text>
                            </>
                        ) : (
                            <>
                                <IconBadge
                                    icon={file
                                        ? { ios: 'doc.text.fill', android: 'description', web: 'description' }
                                        : { ios: 'square.and.arrow.up', android: 'upload_file', web: 'upload_file' }}
                                    size={52}
                                />
                                <Text style={styles.dropZoneTitle} numberOfLines={1}>
                                    {file ? file.name : 'Elegir archivo'}
                                </Text>
                                <Text style={styles.dropZoneHint}>
                                    {file
                                        ? 'Tocá para elegir otro'
                                        : 'Excel (.xlsx, .xls) o .csv · hasta 2 MB y 5.000 filas'}
                                </Text>
                            </>
                        )}
                    </Pressable>
                    <Text style={styles.hint}>Antes de guardar vas a ver qué pasa con cada fila.</Text>
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {result ? (
                    <View style={SharedStyles.pageSection}>
                        <SectionHeader title="3 · Revisá y confirmá" />

                        {result.fileErrors.length > 0 ? (
                            <View style={styles.errorBox}>
                                {result.fileErrors.map((fileError) => (
                                    <Text key={fileError} style={styles.errorText}>• {fileError}</Text>
                                ))}
                            </View>
                        ) : (
                            <>
                                <View style={SharedStyles.statRow}>
                                    <StatTile label="Productos nuevos" value={String(result.productsToCreate)} />
                                    <StatTile label="Variantes nuevas" value={String(result.variantsToCreate)} />
                                </View>
                                <View style={SharedStyles.statRow}>
                                    <StatTile label="A actualizar" value={String(result.variantsToUpdate)} />
                                    <StatTile label="Sin cambios" value={String(result.variantsUnchanged)} />
                                    <StatTile label="Con errores" value={String(result.rowsWithErrors)} />
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

                                <AppButton
                                    title={importMutation.isPending
                                        ? 'Importando...'
                                        : pendingChanges > 0 || !result.valid ? 'Importar' : 'No hay cambios para importar'}
                                    onPress={handleConfirm}
                                    disabled={!canConfirm}
                                />

                                {result.variantsUnchanged > 0 ? (
                                    <Pressable
                                        onPress={() => setShowUnchanged((current) => !current)}
                                        style={({ pressed }) => pressed && SharedStyles.pressed}
                                    >
                                        <Text style={styles.link}>
                                            {showUnchanged ? 'Ocultar filas sin cambios' : 'Mostrar también las filas sin cambios'}
                                        </Text>
                                    </Pressable>
                                ) : null}

                                {visibleRows.map((row) => <ImportRowCard key={row.row} row={row} />)}
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

/** A la derecha de una descarga: la flecha, o el spinner mientras se baja. */
function DownloadIcon({ loading }: { loading: boolean }) {
    return loading ? (
        <ActivityIndicator color={Colors.primary} />
    ) : (
        <SymbolView
            name={{ ios: 'arrow.down.circle', android: 'download', web: 'download' }}
            size={22}
            tintColor={Colors.textTertiary}
        />
    );
}

function CatalogList({ title, items, hint }: { title: string; items: string[]; hint?: string }) {
    return (
        <View style={styles.catalogList}>
            <Text style={styles.catalogTitle}>{title}</Text>
            {items.map((item) => <Text key={item} style={styles.catalogItem}>• {item}</Text>)}
            {hint ? <Text style={styles.catalogItem}>{hint}</Text> : null}
        </View>
    );
}

function ImportRowCard({ row }: { row: ProductImportRow }) {
    const badge = ACTION_BADGES[row.action];
    return (
        <View style={[SharedStyles.card, styles.rowCard, row.action === 'ERROR' && styles.rowCardError]}>
            <View style={styles.rowHeader}>
                <View style={SharedStyles.listItemTexts}>
                    <Text style={SharedStyles.listItemTitle} numberOfLines={1}>{row.product ?? 'Sin nombre'}</Text>
                    <Text style={SharedStyles.listItemMeta}>Fila {row.row}{row.sku ? ` · ${row.sku}` : ''}</Text>
                </View>
                <StatusPill label={badge.label} tone={badge.tone} />
            </View>
            {row.errors.map((message) => <Text key={message} style={styles.rowError}>• {message}</Text>)}
            {row.warnings.map((message) => <Text key={message} style={styles.rowWarning}>• {message}</Text>)}
            {row.changes.map((message) => <Text key={message} style={styles.rowChange}>• {message}</Text>)}
        </View>
    );
}

const styles = StyleSheet.create({
    hint: {
        fontSize: 12,
        color: Colors.textSecondary,
        lineHeight: 17,
    },
    // En pantallas anchas (web) las dos tarjetas van lado a lado; en el celular, una abajo de la otra.
    tiles: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    tile: {
        flexGrow: 1,
        flexBasis: 280,
    },
    dropZone: {
        alignItems: 'center',
        gap: Spacing.xs,
        paddingVertical: Spacing.xl,
        paddingHorizontal: Spacing.lg,
        borderRadius: Radius.lg,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: Colors.track,
        backgroundColor: Colors.surface,
    },
    dropZoneSelected: {
        borderStyle: 'solid',
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight,
    },
    dropZoneTitle: {
        marginTop: Spacing.xs,
        fontSize: 15,
        fontWeight: '700',
        color: Colors.text,
        maxWidth: '100%',
    },
    dropZoneHint: {
        fontSize: 12,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
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
        borderRadius: Radius.lg,
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
        borderRadius: Radius.lg,
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
    catalogList: {
        backgroundColor: Colors.warningLight,
        borderRadius: Radius.lg,
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
    rowCard: {
        gap: Spacing.xs,
        padding: Spacing.md,
    },
    rowCardError: {
        borderColor: Colors.errorBorder,
        backgroundColor: Colors.errorInput,
    },
    rowHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.md,
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
