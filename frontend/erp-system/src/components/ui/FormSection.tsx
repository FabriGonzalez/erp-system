import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/spacing';
import { SharedStyles } from '@/styles/shared';

import { SectionHeader } from './SectionHeader';

type FormSectionProps = {
    title: string;
    actionLabel?: string;
    onAction?: () => void;
    children: ReactNode;
};

/** Bloque de un formulario: título de sección y una tarjeta con sus campos. */
export function FormSection({ title, actionLabel, onAction, children }: FormSectionProps) {
    return (
        <View style={SharedStyles.pageSection}>
            <SectionHeader title={title} actionLabel={actionLabel} onAction={onAction} />
            <View style={[SharedStyles.card, styles.card]}>{children}</View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        gap: Spacing.lg,
    },
});
