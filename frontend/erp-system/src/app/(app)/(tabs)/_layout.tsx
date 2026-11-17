import { Colors } from '@/constants/colors';
import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthStore } from '@/stores/auth-store';
import { hasAnyPermission, hasPermission, ORDER_READ_PERMISSIONS } from '@/utils/permissions';

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    const user = useAuthStore((state) => state.user);
    // href null oculta la pestaña: Ventas solo crea pedidos y Envíos necesita leerlos.
    const canSell = hasPermission(user, 'CREAR_PEDIDOS');
    const canSeeShipments = hasAnyPermission(user, ORDER_READ_PERMISSIONS);

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
                name="orders"
                options={{
                    title: 'Ventas',
                    href: canSell ? undefined : null,
                    tabBarIcon: ({ color, size }) => (
                        <SymbolView
                            name={{
                                ios: 'doc.text.fill',
                                android: 'description',
                                web: 'description',
                            }}
                            size={size ?? 24}
                            tintColor={color}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="shipments"
                options={{
                    title: 'Envíos',
                    href: canSeeShipments ? undefined : null,
                    tabBarIcon: ({ color, size }) => (
                        <SymbolView
                            name={{
                                ios: 'shippingbox.fill',
                                android: 'local_shipping',
                                web: 'local_shipping',
                            }}
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
                            name={{
                                ios: 'square.grid.2x2.fill',
                                android: 'grid_view',
                                web: 'grid_view',
                            }}
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
                            name={{
                                ios: 'ellipsis.circle.fill',
                                android: 'more_horiz',
                                web: 'more_horiz',
                            }}
                            size={size ?? 24}
                            tintColor={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}