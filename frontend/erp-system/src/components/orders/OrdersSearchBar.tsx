import { SymbolView } from 'expo-symbols';
import { Pressable, View } from 'react-native';

import { AppInput } from '@/components/ui/AppInput';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

interface OrdersSearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
}

export function OrdersSearchBar({ value, onChangeText }: OrdersSearchBarProps) {
    return (
        <View style={SharedStyles.searchContainer}>
            <SymbolView
                name={{
                    ios: 'magnifyingglass',
                    android: 'search',
                    web: 'search',
                }}
                size={20}
                tintColor={Colors.textSecondary}
            />

            <AppInput
                style={SharedStyles.searchInput}
                placeholder="Buscar por pedido o cliente"
                value={value}
                onChangeText={onChangeText}
                autoCapitalize="none"
                autoCorrect={false}
            />

            {value.length > 0 && (
                <Pressable
                    onPress={() => onChangeText('')}
                    hitSlop={8}
                >
                    <SymbolView
                        name={{
                            ios: 'xmark.circle.fill',
                            android: 'cancel',
                            web: 'cancel',
                        }}
                        size={18}
                        tintColor={Colors.textSecondary}
                    />
                </Pressable>
            )}
        </View>
    );
}
