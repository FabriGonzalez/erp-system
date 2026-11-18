import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ColorPicker, { BrightnessSlider, ColorFormatsObject, Panel3 } from 'reanimated-color-picker';

import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

/** Igual que el tope del backend (ColorSwatch.MAX_COLORS). */
export const MAX_SWATCH_COLORS = 5;

const PALETTE = [
    { name: 'Negro', hex: '#000000' },
    { name: 'Blanco', hex: '#FFFFFF' },
    { name: 'Gris', hex: '#9CA3AF' },
    { name: 'Beige', hex: '#E8D9B5' },
    { name: 'Marrón', hex: '#7B4A2A' },
    { name: 'Azul marino', hex: '#1E2A4A' },
    { name: 'Celeste', hex: '#7DD3FC' },
    { name: 'Rojo', hex: '#DC2626' },
    { name: 'Bordó', hex: '#7F1D1D' },
    { name: 'Verde', hex: '#16A34A' },
    { name: 'Verde oliva', hex: '#6B7A34' },
    { name: 'Amarillo', hex: '#FACC15' },
    { name: 'Naranja', hex: '#F97316' },
    { name: 'Rosa', hex: '#F9A8D4' },
    { name: 'Violeta', hex: '#7C3AED' },
    { name: 'Lila', hex: '#C4B5FD' },
];

// Color con el que arranca uno nuevo: gris medio, para que el círculo y el brillo queden al centro.
const NEW_COLOR = '#808080';
const HEX_PATTERN = /^#?[0-9A-Fa-f]{6}$/;

type ColorSwatchEditorProps = {
    colors: string[];
    onChange: (colors: string[]) => void;
};

/**
 * Lista de colores de una muestra. Se toca un color para elegirlo y se cambia con el círculo, la
 * paleta o el hex; el primero es el primario. Para cambiar el orden: quitar y volver a agregar.
 */
export function ColorSwatchEditor({ colors, onChange }: ColorSwatchEditorProps) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    // Lo que se está escribiendo en el hex del color elegido; null muestra el color guardado.
    const [hexDraft, setHexDraft] = useState<{ index: number; text: string } | null>(null);
    const [hexError, setHexError] = useState<string | null>(null);

    const selected = Math.min(selectedIndex, colors.length - 1);
    const selectedColor = colors[selected];
    const hexText = hexDraft && hexDraft.index === selected ? hexDraft.text : selectedColor;

    function select(index: number) {
        setSelectedIndex(index);
        setHexDraft(null);
        setHexError(null);
    }

    function setSelectedColor(hex: string) {
        onChange(colors.map((color, index) => (index === selected ? hex : color)));
        setHexDraft(null);
        setHexError(null);
    }

    function handleAdd() {
        onChange([...colors, NEW_COLOR]);
        select(colors.length);
    }

    function handleRemove() {
        onChange(colors.filter((_, index) => index !== selected));
        select(Math.max(0, selected - 1));
    }

    function handlePickerComplete(result: ColorFormatsObject) {
        // El hex puede venir con transparencia (#RRGGBBAA): la muestra no la usa.
        setSelectedColor(result.hex.slice(0, 7).toUpperCase());
    }

    function handleHexSubmit() {
        const text = hexText.trim();
        if (!HEX_PATTERN.test(text)) {
            setHexError('Usá 6 dígitos hexadecimales, ej. #1A2B3C.');
            return;
        }
        setSelectedColor(`#${text.replace('#', '').toUpperCase()}`);
    }

    if (selectedColor === undefined) {
        return null;
    }

    return (
        <View style={styles.container}>
            <View style={styles.chips}>
                {colors.map((color, index) => (
                    <Pressable
                        key={index}
                        onPress={() => select(index)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: index === selected }}
                        accessibilityLabel={`${index === 0 ? 'Color primario' : `Color ${index + 1}`}: ${color}`}
                        style={[styles.chip, index === selected && styles.chipSelected]}
                    >
                        <View style={[styles.chipColor, { backgroundColor: color }]} />
                    </Pressable>
                ))}
                {colors.length < MAX_SWATCH_COLORS ? (
                    <Pressable
                        onPress={handleAdd}
                        accessibilityRole="button"
                        accessibilityLabel="Agregar color"
                        style={({ pressed }) => [styles.chip, styles.addChip, pressed && SharedStyles.pressed]}
                    >
                        <SymbolView
                            name={{ ios: 'plus', android: 'add', web: 'add' }}
                            size={18}
                            tintColor={Colors.primary}
                        />
                    </Pressable>
                ) : null}
            </View>

            <View style={styles.selectedRow}>
                <Text style={styles.selectedLabel}>
                    {selected === 0 ? 'Color primario' : `Color ${selected + 1}`}
                </Text>
                <Pressable
                    onPress={handleRemove}
                    accessibilityRole="button"
                    accessibilityLabel="Quitar este color"
                    hitSlop={8}
                    style={({ pressed }) => pressed && SharedStyles.pressed}
                >
                    <Text style={styles.removeText}>Quitar</Text>
                </Pressable>
            </View>

            {/* Los Modal de React Native son otra raíz: los gestos del círculo necesitan la suya. */}
            <GestureHandlerRootView style={styles.picker}>
                <ColorPicker value={selectedColor} onCompleteJS={handlePickerComplete} style={styles.pickerInner}>
                    <Panel3 style={styles.wheel} />
                    <BrightnessSlider style={styles.slider} />
                </ColorPicker>
            </GestureHandlerRootView>

            <View style={styles.palette}>
                {PALETTE.map((item) => (
                    <Pressable
                        key={item.hex}
                        onPress={() => setSelectedColor(item.hex)}
                        accessibilityRole="button"
                        accessibilityLabel={item.name}
                        style={({ pressed }) => [
                            styles.paletteColor,
                            { backgroundColor: item.hex },
                            item.hex === selectedColor && styles.paletteColorSelected,
                            pressed && SharedStyles.pressed,
                        ]}
                    />
                ))}
            </View>

            <View style={styles.hexRow}>
                <AppInput
                    value={hexText}
                    onChangeText={(text) => {
                        setHexDraft({ index: selected, text });
                        setHexError(null);
                    }}
                    onSubmitEditing={handleHexSubmit}
                    onBlur={() => {
                        if (hexDraft) handleHexSubmit();
                    }}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={7}
                    placeholder="#1A2B3C"
                    accessibilityLabel="Color en hexadecimal"
                    style={[styles.hexInput, hexError ? styles.hexInputError : undefined]}
                />
            </View>
            {hexError ? <Text style={styles.errorText}>{hexError}</Text> : null}
        </View>
    );
}

const CHIP_SIZE = 40;
const PALETTE_SIZE = 28;

const styles = StyleSheet.create({
    container: {
        gap: Spacing.md,
    },
    chips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    chip: {
        width: CHIP_SIZE,
        height: CHIP_SIZE,
        borderRadius: Radius.sm,
        borderWidth: 2,
        borderColor: 'transparent',
        padding: 2,
    },
    chipSelected: {
        borderColor: Colors.primary,
    },
    chipColor: {
        flex: 1,
        borderRadius: Radius.sm - 4,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    addChip: {
        alignItems: 'center',
        justifyContent: 'center',
        borderColor: Colors.border,
        borderStyle: 'dashed',
    },
    selectedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.textSecondary,
    },
    removeText: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.error,
    },
    picker: {
        alignItems: 'center',
    },
    pickerInner: {
        width: 220,
        gap: Spacing.md,
    },
    wheel: {
        width: 220,
    },
    slider: {
        borderRadius: Radius.pill,
    },
    palette: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: Spacing.sm,
    },
    paletteColor: {
        width: PALETTE_SIZE,
        height: PALETTE_SIZE,
        borderRadius: Radius.pill,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    paletteColorSelected: {
        borderWidth: 3,
        borderColor: Colors.primary,
    },
    hexRow: {
        flexDirection: 'row',
    },
    hexInput: {
        flex: 1,
    },
    hexInputError: {
        borderColor: Colors.error,
        backgroundColor: Colors.errorInput,
    },
    errorText: {
        fontSize: 12,
        color: Colors.error,
    },
});
