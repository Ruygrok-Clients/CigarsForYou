import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import type { StockAllocationStatus, StockConflictResolution, StockShortfall } from '../types';

export interface StockIssueLine {
  lineIndex: number;
  productId: string;
  name: string;
  brand: string;
  price: number;
  quantity: number;
  allocatedQuantity: number;
  cancelledQuantity: number;
}

export interface StockIssue {
  orderId: string;
  orderNumber: string;
  customerName: string;
  stockAllocationStatus: StockAllocationStatus | null;
  stockShortfalls: StockShortfall[];
  stockConflictDecisionDeadline: string | null;
  stockConflictResolution: StockConflictResolution | null;
  apologyCouponCode: string | null;
  items: StockIssueLine[];
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  refundAmount: number;
  status: string | null;
}

export interface StockAllocationResult {
  stockAllocationStatus: StockAllocationStatus;
  stockConflictToken: string | null;
  apologyCouponCode: string | null;
  orderNumber: string;
}

function callable<Input, Output>(name: string) {
  return httpsCallable<Input, Output>(functions, name);
}

export async function getOrderStockIssue(input: { orderId: string; token?: string | null }): Promise<StockIssue> {
  const run = callable<typeof input, StockIssue>('getOrderStockIssue');
  const result = await run({ orderId: input.orderId, token: input.token || undefined });
  return result.data;
}

export async function allocateOrderStock(input: { orderId: string; token?: string | null }): Promise<StockAllocationResult> {
  const run = callable<typeof input, StockAllocationResult>('allocateOrderStock');
  const result = await run({ orderId: input.orderId, token: input.token || undefined });
  return result.data;
}

export async function resolveStockConflict(input: {
  orderId: string;
  token?: string | null;
  mode: 'full_cancel' | 'partial';
  cancellations?: Array<{ lineIndex: number; productId: string; quantity: number }>;
}): Promise<StockIssue> {
  const run = callable<typeof input, StockIssue>('resolveStockConflict');
  const result = await run({
    orderId: input.orderId,
    token: input.token || undefined,
    mode: input.mode,
    cancellations: input.cancellations,
  });
  return result.data;
}
