export type DeliveryWindow = 'open' | 'early' | 'closed';

function sydneyMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23'
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

/** Open 7:00–19:00, early 6:00–7:00, otherwise closed (Australia/Sydney). */
export function getDeliveryWindow(date: Date = new Date()): DeliveryWindow {
  const mins = sydneyMinutes(date);
  if (mins >= 7 * 60 && mins < 19 * 60) return 'open';
  if (mins >= 6 * 60 && mins < 7 * 60) return 'early';
  return 'closed';
}

export function immediateDispatchHoursMessage(window: DeliveryWindow): string {
  if (window === 'early') {
    return "You're lucky — we opened early today, so we can offer you immediate dispatch.";
  }
  if (window === 'closed') {
    return "We're closed right now. We'll dispatch this first thing tomorrow morning at 7am with Uber Commercial Courier, so it should arrive between 7am and 10am.";
  }
  return "We'll dispatch this straight away. It should arrive within 1–3 hours.";
}

export function freeExpressHoursMessage(window: DeliveryWindow): string {
  if (window === 'closed') {
    return "We're closed right now. Free Express Delivery is dispatched first thing tomorrow morning with courier partners such as DHL or AusPost.";
  }
  if (window === 'early') {
    return "You're lucky — we opened early today. Free Express Delivery goes out with courier partners such as DHL or AusPost.";
  }
  return 'Priority express delivery with logistics and courier partners such as DHL or AusPost.';
}
