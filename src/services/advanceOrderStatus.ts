import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import type { OrderStatus, OrderStatusHistory } from '../types';

export interface AdvanceOrderStatusInput {
  orderId: string;
  trackingNumber?: string;
  trackingCarrier?: string;
  trackingUrl?: string;
}

export interface AdvanceOrderStatusResult {
  success: boolean;
  emailSent?: boolean;
  order: {
    id: string;
    status: OrderStatus;
    statusHistory: OrderStatusHistory[];
    trackingNumber?: string | null;
    trackingCarrier?: string | null;
    trackingUrl?: string | null;
  };
}

export async function advanceOrderStatus(input: AdvanceOrderStatusInput): Promise<AdvanceOrderStatusResult> {
  const callable = httpsCallable<AdvanceOrderStatusInput, AdvanceOrderStatusResult>(functions, 'advanceOrderStatus');
  const result = await callable(input);
  return result.data;
}
