import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

import { AppHeader } from '@/components/AppHeader';

export default function AppLayout() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader />
            <View style={styles.content}>
                <Slot />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    content: {
        flex: 1,
    },
});