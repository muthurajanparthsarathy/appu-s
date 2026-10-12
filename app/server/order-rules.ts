import type { OrderStatus, PaymentMethod, PaymentStatus } from '@/app/generated/prisma/enums';

// Fulfilment moves forward one step at a time; cancellation is a separate action.
export const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: 'PACKING',
  PACKING: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED'
};

export const CUSTOMER_CANCELLABLE: OrderStatus[] = ['PENDING_PAYMENT', 'CONFIRMED'];
export const ADMIN_CANCELLABLE: OrderStatus[] = ['PENDING_PAYMENT', 'CONFIRMED', 'PACKING', 'OUT_FOR_DELIVERY'];

// A paid order that gets cancelled owes the customer a refund; nothing else changes payment state.
export const paymentStatusAfterCancel = (current: PaymentStatus): PaymentStatus => current === 'PAID' ? 'REFUND_DUE' : current;

// Cash on delivery is collected when the order is handed over.
export const paymentStatusAfterAdvance = (method: PaymentMethod, next: OrderStatus, current: PaymentStatus): PaymentStatus =>
  method === 'COD' && next === 'DELIVERED' && current === 'PENDING' ? 'PAID' : current;

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  CONFIRMED: 'Confirmed',
  PACKING: 'Packing',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled'
};

export function paymentLabel(method: PaymentMethod, payment: PaymentStatus, status: OrderStatus) {
  if (payment === 'REFUND_DUE') return 'Refund due';
  if (payment === 'REFUNDED') return 'Refunded';
  if (payment === 'PAID') return method === 'COD' ? 'Cash collected' : 'Paid online';
  if (status === 'CANCELLED') return 'Not charged';
  if (method === 'COD') return 'Pay on delivery';
  return payment === 'FAILED' ? 'Payment failed — retry available' : 'Awaiting online payment';
}

export const TRACKING_STEPS: OrderStatus[] = ['CONFIRMED', 'PACKING', 'OUT_FOR_DELIVERY', 'DELIVERED'];
