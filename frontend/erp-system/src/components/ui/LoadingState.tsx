import { ActivityIndicator, Text, View } from 'react-native';

import { Colors } from '@/constants/colors';
import { SharedStyles } from '@/styles/shared';

type LoadingStateProps = {
    label?: string;
};

export function LoadingState({ label = 'Cargando...' }: LoadingStateProps) {
    return (
        <View style={SharedStyles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={SharedStyles.loadingText}>{label}</Text>
        </View>
    );
}