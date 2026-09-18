import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/AppHeader';
import { Colors } from '@/constants/colors';

export default function AppLayout() {
    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <AppHeader />

            <View style={styles.content}>
                <Stack screenOptions={{ headerShown: false }} />
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