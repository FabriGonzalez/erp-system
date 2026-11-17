import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import {
    SafeAreaView,
    SafeAreaViewProps,
} from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';
import { MAX_CONTENT_WIDTH } from '@/constants/spacing';

type ScreenProps = SafeAreaViewProps;

/**
 * Contenedor de cada pantalla. En pantallas anchas (web, tablet) el contenido queda en una
 * columna centrada de MAX_CONTENT_WIDTH; en el celular ocupa todo el ancho como siempre.
 * El style de cada pantalla se aplica a la columna, así padding y alineaciones no cambian.
 *
 * Con el teclado abierto la pantalla se achica a lo que queda visible: el campo enfocado se
 * puede llevar a la vista y los botones de abajo (FormFooter) quedan arriba del teclado. En
 * Android la app es edge-to-edge y la ventana ya no se achica sola. En web no hace falta.
 */
export function Screen({
    style,
    children,
    ...props
}: ScreenProps) {
    return (
        <KeyboardAvoidingView
            style={styles.backdrop}
            behavior={Platform.OS === 'web' ? undefined : 'padding'}
        >
            <SafeAreaView
                edges={['left', 'right']}
                style={[
                    styles.container,
                    style,
                ]}
                {...props}
            >
                {children}
            </SafeAreaView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    container: {
        flex: 1,
        width: '100%',
        maxWidth: MAX_CONTENT_WIDTH,
        alignSelf: 'center',
        backgroundColor: Colors.background,
    },
});
