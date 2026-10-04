export type DeliveryWindow = 'open' | 'early' | 'closed';

const CLOSE_MINUTES = 19 * 60;
const CLOSING_SOON_START_MINUTES = 18 * 60 + 45;
const GRACE_END_MINUTES = 19 * 60 + 10;
const FINAL_CALL_END_MINUTES = 19 * 60 + 15;

interface SydneyParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function sydneyDateTimeParts(date: Date): SydneyParts {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23'
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second')
  };
}

function sydneySeconds(date: Date): number {
  const { hour, minute, second } = sydneyDateTimeParts(date);
  return hour * 3600 + minute * 60 + second;
}

function sydneyMinutes(date: Date): number {
  const { hour, minute } = sydneyDateTimeParts(date);
  return hour * 60 + minute;
}

/** YYYY-MM-DD in Australia/Sydney, for once-per-evening popup keys. */
export function sydneyDateKey(date: Date = new Date()): string {
  const { year, month, day } = sydneyDateTimeParts(date);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** True from 6:45pm until 7:00pm Australia/Sydney. */
export function isClosingSoon(date: Date = new Date()): boolean {
  const mins = sydneyMinutes(date);
  return mins >= CLOSING_SOON_START_MINUTES && mins < CLOSE_MINUTES;
}

/** Milliseconds until 7:00pm Sydney. 0 once that minute has been reached. */
export function msUntilClose(date: Date = new Date()): number {
  const nowSeconds = sydneySeconds(date);
  const closeSeconds = CLOSE_MINUTES * 60;
  if (nowSeconds >= closeSeconds) return 0;
  return Math.max(0, (closeSeconds - nowSeconds) * 1000 - date.getMilliseconds());
}

/** True from 7:00pm until 7:10pm Australia/Sydney. */
export function isWithinGraceWindow(date: Date = new Date()): boolean {
  const mins = sydneyMinutes(date);
  return mins >= CLOSE_MINUTES && mins < GRACE_END_MINUTES;
}

/** Milliseconds until 7:10pm Sydney. 0 once that minute has been reached. */
export function msUntilGraceEnd(date: Date = new Date()): number {
  const nowSeconds = sydneySeconds(date);
  const endSeconds = GRACE_END_MINUTES * 60;
  if (nowSeconds >= endSeconds) return 0;
  return Math.max(0, (endSeconds - nowSeconds) * 1000 - date.getMilliseconds());
}

/** True from 7:10pm until 7:15pm Australia/Sydney. */
export function isWithinFinalCallWindow(date: Date = new Date()): boolean {
  const mins = sydneyMinutes(date);
  return mins >= GRACE_END_MINUTES && mins < FINAL_CALL_END_MINUTES;
}

/** Milliseconds until 7:15pm Sydney. 0 once that minute has been reached. */
export function msUntilFinalCallEnd(date: Date = new Date()): number {
  const nowSeconds = sydneySeconds(date);
  const endSeconds = FINAL_CALL_END_MINUTES * 60;
  if (nowSeconds >= endSeconds) return 0;
  return Math.max(0, (endSeconds - nowSeconds) * 1000 - date.getMilliseconds());
}

/** Milliseconds until 6:45pm Sydney today. 0 if that minute has already passed. */
export function msUntilClosingSoon(date: Date = new Date()): number {
  const nowSeconds = sydneySeconds(date);
  const startSeconds = CLOSING_SOON_START_MINUTES * 60;
  if (nowSeconds >= startSeconds) return 0;
  return Math.max(0, (startSeconds - nowSeconds) * 1000 - date.getMilliseconds());
}

/** Live remaining time, e.g. "14m 5s" or "1h 2m 3s". */
export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
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
    return "We're closed right now. We'll dispatch this first thing tomorrow morning at 7am with our official Didi partners, so it should arrive between 7am and 10am.";
  }
  return "We'll dispatch this straight away. It should arrive within 1–3 hours.";
}

export function freeExpressHoursMessage(window: DeliveryWindow): string {
  if (window === 'closed') {
    return "We're closed right now. Express Delivery is dispatched first thing tomorrow morning with courier partners such as StarTrack or AusPost.";
  }
  if (window === 'early') {
    return "You're lucky — we opened early today. Express Delivery goes out with courier partners such as StarTrack or AusPost.";
  }
  return 'Priority express delivery with logistics and courier partners such as StarTrack or AusPost.';
}
