import { router } from 'expo-router';

import { EmptyState } from './EmptyState';
import { IconName } from './icon-name';
import { PageHeader } from './PageHeader';
import { Screen } from './Screen';

type NotFoundProps = {
    headerTitle: string;
    title: string;
    description: string;
    iconName?: IconName;
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
            <PageHeader onBack={handleBack} title={headerTitle} />

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
