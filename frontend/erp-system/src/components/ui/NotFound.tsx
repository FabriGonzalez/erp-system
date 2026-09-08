import { router } from 'expo-router';
import { SymbolView, SFSymbol, AndroidSymbol } from 'expo-symbols';
import { Pressable, Text, View } from 'react-native';

import { EmptyState } from './EmptyState';
import { Screen } from './Screen';
import { Colors } from '@/constants/colors';
import { SharedStyles } from '@/styles/shared';

type NotFoundProps = {
    headerTitle: string;
    title: string;
    description: string;
    iconName?: { ios: SFSymbol; android: AndroidSymbol; web: AndroidSymbol };
    actionLabel?: string;
    onBack?: () => void;
};

export function NotFound({
    headerTitle,
    title,
    description,
    iconName,
    actionLabel = 'Volver',
    onBack,
}: NotFoundProps) {
    const handleBack = onBack ?? (() => router.back());

    return (
        <Screen>
            <View style={SharedStyles.header}>
                <Pressable
                    onPress={handleBack}
                    style={({ pressed }) => [
                        SharedStyles.backButton,
                        pressed && SharedStyles.pressed,
                    ]}
                >
                    <SymbolView
                        name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
                        size={24}
                        tintColor={Colors.text}
                    />
                </Pressable>

                <Text style={SharedStyles.headerTitle}>{headerTitle}</Text>

                <View style={SharedStyles.headerSpacer} />
            </View>

            <EmptyState
                title={title}
                description={description}
                iconName={iconName}
                actionLabel={actionLabel}
                onAction={handleBack}
            />
        </Screen>
    );
}