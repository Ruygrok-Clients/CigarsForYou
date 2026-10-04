import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import type { ImmediateDispatchResolution, Order } from '../types';

export type ImmediateDispatchAction = 'mark_unavailable' | 'full_refund' | 'express_upgrade';

export interface ResolveImmediateDispatchResult {
  success: boolean;
  emailSent?: boolean;
  resendOnly?: boolean;
  order: Order & { immediateDispatchResolution?: ImmediateDispatchResolution };
}

export async function resolveImmediateDispatch(input: {
  orderId: string;
  action: ImmediateDispatchAction;
  restoreStockIndexes?: number[];
}): Promise<ResolveImmediateDispatchResult> {
  const callable = httpsCallable<typeof input, ResolveImmediateDispatchResult>(
    functions,
    'resolveImmediateDispatch'
  );
  const result = await callable(input);
  return result.data;
}
