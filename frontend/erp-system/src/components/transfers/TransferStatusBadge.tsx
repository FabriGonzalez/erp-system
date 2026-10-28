import { StatusPill } from '@/components/ui/StatusPill';
import { STOCK_TRANSFER_STATUS_LABELS, StockTransferStatus } from '@/types/transfer';

export function TransferStatusBadge({ status }: { status: StockTransferStatus }) {
    return (
        <StatusPill
            label={STOCK_TRANSFER_STATUS_LABELS[status]}
            tone={status === 'CANCELLED' ? 'neutral' : 'success'}
        />
    );
}
