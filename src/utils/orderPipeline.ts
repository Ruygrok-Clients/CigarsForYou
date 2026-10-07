import type { DeliveryMethod, OrderStatus } from '../types';

export function orderStatusSteps(method: DeliveryMethod | undefined): OrderStatus[] {
  if (method === 'pickup') {
    return ['Order Placed', 'Processing', 'Collectable', 'Fulfilled'];
  }
  return ['Order Placed', 'Processing', 'Shipped', 'Fulfilled'];
}

export function nextOrderStatus(status: OrderStatus, method: DeliveryMethod | undefined): OrderStatus | null {
  if (status === 'Fulfilled' || status === 'Cancelled') return null;
  const steps = orderStatusSteps(method);
  const index = steps.indexOf(status);
  if (index < 0 || index >= steps.length - 1) return null;
  return steps[index + 1];
}

export function advanceActionLabel(next: OrderStatus): string {
  if (next === 'Shipped') return 'Mark Shipped';
  if (next === 'Collectable') return 'Mark Collectable';
  if (next === 'Fulfilled') return 'Mark Fulfilled';
  if (next === 'Processing') return 'Mark Processing';
  return `Advance to ${next}`;
}
