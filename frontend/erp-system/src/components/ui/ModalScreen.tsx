import { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { MAX_CONTENT_WIDTH } from '@/constants/spacing';

import { HeaderButton } from './HeaderButton';
import { PageHeader } from './PageHeader';

type ModalScreenProps = {
    visible?: boolean;
    title: string;
    /** Dato chico arriba del título (la sucursal del stock). */
    eyebrow?: string;
    onClose: () => void;
    /** Botón de cerrar, a la derecha del título: "Listo" o "Cancelar". */
    closeLabel?: string;
    children: ReactNode;
};

/**
 * Modal de pantalla completa con el encabezado de las pantallas (catálogo de productos de una
 * promo o una transferencia, elegir las variantes de una promo). El contenido ocupa el resto:
 * una barra fija abajo (CartSummaryBar) se apoya en él.
 */
export function ModalScreen({
    visible = true,
    title,
    eyebrow,
    onClose,
    closeLabel = 'Listo',
    children,
}: ModalScreenProps) {
    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <SafeAreaView style={styles.backdrop}>
                <KeyboardAvoidingView
                    style={styles.column}
                    behavior={Platform.OS === 'web' ? undefined : 'padding'}
                >
                    <PageHeader
                        title={title}
                        eyebrow={eyebrow}
                        right={<HeaderButton label={closeLabel} onPress={onClose} variant="secondary" icon={null} />}
                    />
                    <View style={styles.body}>{children}</View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    column: {
        flex: 1,
        width: '100%',
        maxWidth: MAX_CONTENT_WIDTH,
        alignSelf: 'center',
    },
    body: {
        flex: 1,
    },
});
