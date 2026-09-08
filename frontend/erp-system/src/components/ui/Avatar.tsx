import { ReactNode } from 'react';
import { StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';

import { Colors } from '@/constants/colors';
import { getInitials } from '@/utils/format';

type AvatarProps = {
    name?: string;
    initials?: string;
    size?: number;
    backgroundColor?: string;
    textColor?: string;
    fontSize?: number;
    fontWeight?: TextStyle['fontWeight'];
    children?: ReactNode;
    style?: ViewStyle;
};

export function Avatar({
    name,
    initials,
    size = 40,
    backgroundColor = Colors.primaryLight,
    textColor = Colors.primary,
    fontSize,
    fontWeight = '600',
    children,
    style,
}: AvatarProps) {
    return (
        <View
            style={[
                styles.circle,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor,
                },
                style,
            ]}
        >
            {children ?? (
                <Text
                    numberOfLines={1}
                    style={[
                        styles.text,
                        {
                            color: textColor,
                            fontSize: fontSize ?? Math.round(size / 2.8),
                            fontWeight,
                        },
                    ]}
                >
                    {initials ?? getInitials(name ?? '')}
                </Text>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    circle: {
        alignItems: 'center',
        justifyContent: 'center',
    },

    text: {
        fontWeight: '600',
    },
});