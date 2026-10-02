import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import type { Address, DeliveryMethod } from '../types';

export interface PlaceRewardOrderInput {
  items: { rewardProductId: string; quantity: number }[];
  deliveryMethod: DeliveryMethod;
  deliveryAddress: Pick<Address, 'street' | 'suburb' | 'state' | 'postcode' | 'country'>;
  customerName: string;
  customerPhone?: string;
  ageConfirmed: boolean;
}

export interface PlaceRewardOrderResult {
  orderId: string;
  orderNumber: string;
  pointsSpent: number;
  shippingFee: number;
}

export async function placeRewardOrder(input: PlaceRewardOrderInput): Promise<PlaceRewardOrderResult> {
  const callable = httpsCallable<PlaceRewardOrderInput, PlaceRewardOrderResult>(functions, 'placeRewardOrder');
  const result = await callable(input);
  return result.data;
}
