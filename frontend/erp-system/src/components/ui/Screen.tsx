import { StyleSheet, View } from 'react-native';
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
 */
export function Screen({
    style,
    children,
    ...props
}: ScreenProps) {
    return (
        <View style={styles.backdrop}>
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
        </View>
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
