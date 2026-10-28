import { StatusPill } from '@/components/ui/StatusPill';
import { Tone } from '@/constants/tones';
import { PROMOTION_STATUS_LABELS, PromotionStatus } from '@/types/promotion';

const TONES: Record<PromotionStatus, Tone> = {
    ACTIVE: 'success',
    SCHEDULED: 'primary',
    EXPIRED: 'warning',
    INACTIVE: 'neutral',
};

export function PromotionStatusBadge({ status }: { status: PromotionStatus }) {
    return <StatusPill label={PROMOTION_STATUS_LABELS[status]} tone={TONES[status]} />;
}
