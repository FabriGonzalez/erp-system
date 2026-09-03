import { Colors } from '@/constants/colors';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textSecondary,
                tabBarStyle: {
                    backgroundColor: Colors.surface,
                    borderTopColor: Colors.border,
                    borderTopWidth: 1,
                    height: 60 + insets.bottom,
                    paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
                    paddingTop: 8,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Inicio',
                    tabBarIcon: ({ color, size }) => (
                        <SymbolView
                            name={{ ios: 'house.fill', android: 'home', web: 'home' }}
                            size={size ?? 24}
                            tintColor={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="products"
                options={{
                    title: 'Productos',
                    tabBarIcon: ({ color, size }) => (
                        <SymbolView
                            name={{ ios: 'square.grid.2x2.fill', android: 'grid_view', web: 'grid_view' }}
                            size={size ?? 24}
                            tintColor={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="orders"
                options={{
                    title: 'Pedidos',
                    tabBarIcon: ({ color, size }) => (
                        <SymbolView
                            name={{ ios: 'doc.text.fill', android: 'description', web: 'description' }}
                            size={size ?? 24}
                            tintColor={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="more"
                options={{
                    title: 'Más',
                    tabBarIcon: ({ color, size }) => (
                        <SymbolView
                            name={{ ios: 'ellipsis.circle.fill', android: 'more_horiz', web: 'more_horiz' }}
                            size={size ?? 24}
                            tintColor={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}