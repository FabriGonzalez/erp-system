import { SearchBar } from '@/components/ui/SearchBar';

interface OrdersSearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
}

export function OrdersSearchBar({
    value,
    onChangeText,
}: OrdersSearchBarProps) {
    return (
        <SearchBar
            value={value}
            onChangeText={onChangeText}
            placeholder="Buscar por pedido o cliente"
            autoCapitalize="none"
            autoCorrect={false}
        />
    );
}
