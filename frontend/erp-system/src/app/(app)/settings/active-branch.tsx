import { StyleSheet, Text, View, Pressable, FlatList } from 'react-native';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { Screen } from '@/components/ui/Screen';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { useAuthStore } from '@/stores/auth-store';
import { useBranchStore } from '@/stores/branch-store';
import { Branch } from '@/types/branch';

export default function ActiveBranchScreen() {
    const user = useAuthStore((state) => state.user);
    const { activeBranch, setActiveBranch } = useBranchStore();

    const availableBranches = user?.branches ?? [];

    function handleSelectBranch(branch: Branch) {
        setActiveBranch(branch);
        router.back();
    }

    return (
        <Screen style={styles.container}>
            {/* Header local con botón Back */}
            <View style={styles.header}>
                <Pressable
                    onPress={() => router.back()}
                    style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>
                <Text style={styles.headerTitle}>Seleccionar Sucursal</Text>
                <View style={styles.headerSpacer} />
            </View>

            <Text style={styles.description}>
                Selecciona la sucursal activa en la que deseas operar actualmente. El inventario y los pedidos se filtrarán para esta sucursal.
            </Text>

            <FlatList
                data={availableBranches}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                renderItem={({ item }) => {
                    const isActive = activeBranch?.id === item.id;
                    return (
                        <Pressable
                            onPress={() => handleSelectBranch(item)}
                            style={({ pressed }) => [
                                styles.branchItem,
                                isActive && styles.activeItem,
                                pressed && styles.pressed
                            ]}
                        >
                            <View style={styles.branchInfo}>
                                <SymbolView
                                    name={{ ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' }}
                                    size={22}
                                    tintColor={isActive ? Colors.primary : Colors.textSecondary}
                                    style={styles.locationIcon}
                                />
                                <Text style={[styles.branchName, isActive && styles.activeBranchName]}>
                                    {item.name}
                                </Text>
                            </View>

                            {isActive && (
                                <SymbolView
                                    name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                                    size={22}
                                    tintColor={Colors.primary}
                                />
                            )}
                        </Pressable>
                    );
                }}
            />
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 0,
        backgroundColor: Colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    backButton: {
        padding: Spacing.xs,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: Colors.text,
    },
    headerSpacer: {
        width: 32, // Para balancear el botón back
    },
    description: {
        fontSize: 14,
        color: Colors.textSecondary,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.md,
        lineHeight: 20,
    },
    listContainer: {
        paddingHorizontal: Spacing.lg,
        gap: Spacing.md,
    },
    branchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: Colors.surface,
        padding: Spacing.lg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.border,
    },
    activeItem: {
        borderColor: Colors.primary,
        backgroundColor: Colors.primaryLight,
    },
    branchInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    locationIcon: {
        marginRight: Spacing.md,
    },
    branchName: {
        fontSize: 16,
        fontWeight: '500',
        color: Colors.text,
    },
    activeBranchName: {
        fontWeight: '600',
        color: Colors.primary,
    },
    pressed: {
        opacity: 0.8,
    },
});
