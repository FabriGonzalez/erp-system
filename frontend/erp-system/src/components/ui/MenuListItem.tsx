import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView, SFSymbol, AndroidSymbol } from 'expo-symbols';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

type MenuListItemProps = {
    title: string;
    subtitle?: string;
    iconName?: { ios: SFSymbol; android: AndroidSymbol; web: AndroidSymbol };
    onPress: () => void;
    showChevron?: boolean;
    textColor?: string;
};


export function MenuListItem({
    title,
    subtitle,
    iconName,
    onPress,
    showChevron = true,
    textColor = Colors.text,
}: MenuListItemProps) {
    return (
        <Pressable
            onPress={onPress}
            style={({ pressed }) => [
                styles.container,
                pressed && styles.pressed
            ]}
        >
            <View style={styles.leftContent}>
                {iconName && (
                    <View style={styles.iconContainer}>
                        <SymbolView
                            name={iconName}
                            size={20}
                            tintColor={textColor === Colors.text ? Colors.textSecondary : textColor}
                        />
                    </View>
                )}
                <View style={styles.textContainer}>
                    <Text style={[styles.title, { color: textColor }]}>{title}</Text>
                    {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
            </View>

            {showChevron && (
                <SymbolView
                    name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                    size={16}
                    tintColor={Colors.textSecondary}
                    style={styles.chevron}
                />
            )}
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: Spacing.md,
        paddingHorizontal: Spacing.lg,
        backgroundColor: Colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
    },
    pressed: {
        backgroundColor: Colors.muted,
    },
    leftContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        marginRight: Spacing.md,
        width: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        fontSize: 16,
        fontWeight: '500',
    },
    subtitle: {
        fontSize: 12,
        color: Colors.textSecondary,
        marginTop: 2,
    },
    chevron: {
        marginLeft: Spacing.sm,
        opacity: 0.6,
    },
});
