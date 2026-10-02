/**
 * Approximate Immediate Dispatch fee.
 * Keep in sync with src/utils/immediateDispatchFee.ts.
 * Origin is internal postcode 2073 — never surface that place name in UI copy.
 */

const ORIGIN = { lat: -33.7444, lng: 151.1415 };
const BASE_FEE = 12;
const PER_KM = 1.15;

interface PostcodeBand {
  min: number;
  max: number;
  lat: number;
  lng: number;
  zone: string;
}

/** Contiguous NSW bands covering 2000–2599 and 2619–2899. */
const NSW_BANDS: PostcodeBand[] = [
  { min: 2000, max: 2010, lat: -33.868, lng: 151.209, zone: 'sydney-cbd' },
  { min: 2011, max: 2036, lat: -33.905, lng: 151.245, zone: 'sydney-east' },
  { min: 2037, max: 2050, lat: -33.875, lng: 151.175, zone: 'sydney-inner-west' },
  { min: 2051, max: 2069, lat: -33.835, lng: 151.210, zone: 'lower-north-shore' },
  { min: 2070, max: 2087, lat: -33.750, lng: 151.140, zone: 'upper-north-shore' },
  { min: 2088, max: 2108, lat: -33.760, lng: 151.280, zone: 'northern-beaches' },
  { min: 2109, max: 2126, lat: -33.800, lng: 151.100, zone: 'ryde' },
  { min: 2127, max: 2145, lat: -33.815, lng: 151.000, zone: 'parramatta' },
  { min: 2146, max: 2169, lat: -33.800, lng: 150.900, zone: 'western-sydney' },
  { min: 2170, max: 2179, lat: -33.920, lng: 150.920, zone: 'liverpool' },
  { min: 2180, max: 2200, lat: -33.920, lng: 151.040, zone: 'bankstown' },
  { min: 2201, max: 2234, lat: -34.030, lng: 151.100, zone: 'sutherland' },
  { min: 2235, max: 2249, lat: -34.030, lng: 151.100, zone: 'sutherland' },
  { min: 2250, max: 2263, lat: -33.430, lng: 151.340, zone: 'central-coast' },
  { min: 2264, max: 2308, lat: -32.930, lng: 151.780, zone: 'newcastle' },
  { min: 2309, max: 2339, lat: -32.450, lng: 151.350, zone: 'hunter' },
  { min: 2340, max: 2359, lat: -31.090, lng: 150.930, zone: 'tamworth' },
  { min: 2360, max: 2419, lat: -29.900, lng: 150.200, zone: 'new-england' },
  { min: 2420, max: 2439, lat: -31.900, lng: 152.450, zone: 'mid-north-coast' },
  { min: 2440, max: 2459, lat: -30.700, lng: 152.950, zone: 'kempsey-coffs' },
  { min: 2460, max: 2479, lat: -29.400, lng: 153.050, zone: 'grafton-lismore' },
  { min: 2480, max: 2499, lat: -28.450, lng: 153.450, zone: 'northern-rivers' },
  { min: 2500, max: 2530, lat: -34.430, lng: 150.890, zone: 'illawarra' },
  { min: 2531, max: 2554, lat: -34.950, lng: 150.550, zone: 'south-coast' },
  { min: 2555, max: 2574, lat: -34.250, lng: 150.700, zone: 'macarthur' },
  { min: 2575, max: 2599, lat: -34.600, lng: 149.500, zone: 'southern-tablelands' },
  { min: 2619, max: 2620, lat: -35.350, lng: 149.230, zone: 'queanbeyan' },
  { min: 2621, max: 2639, lat: -36.000, lng: 149.200, zone: 'snowy' },
  { min: 2640, max: 2649, lat: -36.070, lng: 146.920, zone: 'albury' },
  { min: 2650, max: 2669, lat: -35.110, lng: 147.370, zone: 'wagga' },
  { min: 2670, max: 2710, lat: -34.400, lng: 146.000, zone: 'riverina' },
  { min: 2711, max: 2739, lat: -35.530, lng: 144.960, zone: 'murray' },
  { min: 2740, max: 2769, lat: -33.760, lng: 150.770, zone: 'penrith' },
  { min: 2770, max: 2786, lat: -33.720, lng: 150.400, zone: 'blue-mountains' },
  { min: 2787, max: 2809, lat: -33.400, lng: 149.700, zone: 'bathurst' },
  { min: 2810, max: 2839, lat: -32.400, lng: 148.700, zone: 'central-west' },
  { min: 2840, max: 2859, lat: -30.700, lng: 146.400, zone: 'north-west' },
  { min: 2860, max: 2879, lat: -33.140, lng: 148.100, zone: 'parkes' },
  { min: 2880, max: 2899, lat: -31.960, lng: 141.450, zone: 'far-west' }
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

function roundToNearestHalf(amount: number): number {
  return Math.round(amount * 2) / 2;
}

export interface ImmediateDispatchQuote {
  feeAud: number;
  zoneLabel: string;
  approxKm: number;
}

export function estimateImmediateDispatchFee(input: {
  postcode: string;
  state: string;
}): ImmediateDispatchQuote | null {
  if (input.state.trim().toUpperCase() !== 'NSW') return null;

  const digits = input.postcode.replace(/\s/g, '');
  if (!/^\d{4}$/.test(digits)) return null;

  const postcode = Number(digits);
  const band = NSW_BANDS.find((entry) => postcode >= entry.min && postcode <= entry.max);
  if (!band) return null;

  const approxKm = Math.round(haversineKm(ORIGIN.lat, ORIGIN.lng, band.lat, band.lng) * 10) / 10;
  const feeAud = roundToNearestHalf(BASE_FEE + PER_KM * approxKm);

  return {
    feeAud,
    zoneLabel: band.zone,
    approxKm
  };
}
