export const IMMEDIATE_DISPATCH_NAME = 'Immediate Dispatch (1-3hrs Delivery)';
export const EXPRESS_DELIVERY_NAME = 'Express Shipping';
export const EXPRESS_DELIVERY_FEE = 12;
export const INSTORE_PICKUP_NAME = 'In-Store Pickup';
export const INSTORE_PICKUP_FEE = 0;

export const DIDI_PARTNER_BLURB =
  'We are an official partner with Didi, they handle all our Immediate Dispatch Deliveries to ensure we bring you the fastest delivery time possible.';

export const EXPRESS_DELIVERY_BLURB =
  'Express Shipping is a flat $12 priority service with logistics and courier partners such as StarTrack or AusPost.';

export const INSTORE_PICKUP_BLURB =
  'Collect your online order from a CigarsForYou distribution hub. Hubs are pickup points only — you cannot browse stock or catalogues in store. Collection is free during open hours, 7:00am to 7:00pm Sydney time. We email you when the order is ready to collect.';

export function deliveryMethodLabel(method: string | undefined): string {
  if (method === 'immediate') return IMMEDIATE_DISPATCH_NAME;
  if (method === 'pickup') return INSTORE_PICKUP_NAME;
  return EXPRESS_DELIVERY_NAME;
}
