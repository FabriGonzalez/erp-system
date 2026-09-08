import {
    SafeAreaView,
    SafeAreaViewProps,
} from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';

type ScreenProps = SafeAreaViewProps;

export function Screen({
    style,
    children,
    ...props
}: ScreenProps) {
    return (
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
    );
}

const styles = {
    container: {
        flex: 1,
        backgroundColor: Colors.background
    },
};