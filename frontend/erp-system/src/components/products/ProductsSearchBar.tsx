import { SearchBar } from '@/components/ui/SearchBar';

interface ProductsSearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
}

export function ProductsSearchBar({
    value,
    onChangeText,
}: ProductsSearchBarProps) {
    return (
        <SearchBar
            value={value}
            onChangeText={onChangeText}
            placeholder="Buscar por nombre o SKU..."
            returnKeyType="search"
        />
    );
}
