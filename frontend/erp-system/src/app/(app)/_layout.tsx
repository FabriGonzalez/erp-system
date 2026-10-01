import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/AppHeader';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';

export default function AppLayout() {
    const { user, token } = useAuthStore();
    const { fetchUserBranches, hasFetchedUserBranches } = useBranchStore();

    useEffect(() => {
        if (user && token && !hasFetchedUserBranches) {
            fetchUserBranches(user.id, token).catch(() => {});
        }
    }, [user, token, hasFetchedUserBranches, fetchUserBranches]);

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