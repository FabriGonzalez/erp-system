import { View } from 'react-native';

import { InfoRow } from '@/components/ui/InfoRow';
import { ListGroup } from '@/components/ui/ListGroup';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { StatTile } from '@/components/ui/StatTile';
import { StatusPill } from '@/components/ui/StatusPill';
import { SharedStyles } from '@/styles/shared';
import { DELIVERY_TYPE_LABELS, Order, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '@/types/order';
import { formatAddress } from '@/utils/address';
import { formatCurrency } from '@/utils/format';
import { paymentStatusTone } from '@/utils/status';

interface OrderInfoCardProps {
    order: Order;
}

/** Cobro (total, entregó, debe) y los datos del pedido. */
export function OrderInfoCard({ order }: OrderInfoCardProps) {
    const isShipping = order.deliveryType === 'SHIPPING';

    return (
        <>
            <View style={SharedStyles.statRow}>
                <StatTile label="Total" value={formatCurrency(order.total)} />
                <StatTile label="Entregó" value={formatCurrency(order.amountPaid)} />
                {order.balance > 0 ? (
                    <StatTile label="Debe" value={formatCurrency(order.balance)} />
                ) : null}
            </View>

            <View style={SharedStyles.pageSection}>
                <SectionHeader title="Datos" />
                <ListGroup>
                    <InfoRow label="Cliente" value={order.customerName} />
                    <InfoRow label="Entrega" value={DELIVERY_TYPE_LABELS[order.deliveryType]} />
                    {isShipping ? (
                        <InfoRow
                            label="Dirección"
                            value={order.shippingAddress
                                ? formatAddress(order.shippingAddress)
                                : 'Sin dirección registrada'}
                        />
                    ) : null}
                    <InfoRow label="Sucursal" value={order.branchName} />
                    {order.paymentMethod ? (
                        <InfoRow label="Medio de pago" value={PAYMENT_METHOD_LABELS[order.paymentMethod]} />
                    ) : null}
                    <InfoRow
                        label="Cobro"
                        value={(
                            <StatusPill
                                label={PAYMENT_STATUS_LABELS[order.paymentStatus]}
                                tone={paymentStatusTone(order.paymentStatus)}
                            />
                        )}
                    />
                </ListGroup>
            </View>
        </>
    );
}
