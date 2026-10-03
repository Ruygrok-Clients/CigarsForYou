/**
 * Immediate Dispatch fee from a geocoded street address.
 * Origin is internal — never surface that place name in UI copy.
 */

import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

export const googleMapsApiKey = defineSecret("GOOGLE_MAPS_API_KEY");

export const EXPRESS_DELIVERY_FEE = 12;

const ORIGIN = { lat: -33.7444, lng: 151.1415 };
const BASE_FEE = 12;
const PER_KM = 1.25;

export interface ImmediateDispatchQuote {
  feeAud: number;
  approxKm: number;
}

export interface DeliveryAddressInput {
  street: string;
  suburb: string;
  state: string;
  postcode: string;
}

interface AddressComponent {
  long_name?: string;
  short_name?: string;
  types?: string[];
}

interface GeocodeResult {
  partial_match?: boolean;
  address_components?: AddressComponent[];
  geometry?: {
    location?: { lat?: number; lng?: number };
    location_type?: string;
  };
}

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

export function feeFromCoords(lat: number, lng: number): ImmediateDispatchQuote {
  const approxKm = Math.round(haversineKm(ORIGIN.lat, ORIGIN.lng, lat, lng) * 10) / 10;
  const feeAud = roundToNearestHalf(BASE_FEE + PER_KM * approxKm);
  return { feeAud, approxKm };
}

function findComponent(components: AddressComponent[], type: string): AddressComponent | undefined {
  return components.find((component) => Array.isArray(component.types) && component.types.includes(type));
}

function asTrimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeDeliveryAddress(input: {
  street?: unknown;
  suburb?: unknown;
  state?: unknown;
  postcode?: unknown;
}): DeliveryAddressInput | null {
  const street = asTrimmed(input.street);
  const suburb = asTrimmed(input.suburb);
  const state = asTrimmed(input.state).toUpperCase();
  const postcode = asTrimmed(input.postcode).replace(/\s/g, "");
  if (street.length < 3 || suburb.length < 2 || state !== "NSW" || !/^\d{4}$/.test(postcode)) {
    return null;
  }
  return { street, suburb, state, postcode };
}

async function geocodeAddress(address: DeliveryAddressInput): Promise<{ lat: number; lng: number } | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  }

  const query = `${address.street}, ${address.suburb} ${address.state} ${address.postcode}, Australia`;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("components", "country:AU");
  url.searchParams.set("region", "au");
  url.searchParams.set("key", key);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Geocoding request failed (${response.status})`);
  }

  const payload = (await response.json()) as {
    status?: string;
    error_message?: string;
    results?: GeocodeResult[];
  };

  if (payload.status === "ZERO_RESULTS") return null;
  if (payload.status !== "OK" || !Array.isArray(payload.results) || payload.results.length === 0) {
    logger.error("Geocoding failed", { status: payload.status, error: payload.error_message });
    throw new Error(payload.error_message || `Geocoding status ${payload.status || "UNKNOWN"}`);
  }

  const result = payload.results[0];
  if (result.partial_match) return null;

  const locationType = result.geometry?.location_type;
  if (locationType === "APPROXIMATE") return null;

  const components = result.address_components || [];
  const country = findComponent(components, "country")?.short_name;
  const state = findComponent(components, "administrative_area_level_1")?.short_name;
  if (country !== "AU" || state !== "NSW") return null;

  const postal = findComponent(components, "postal_code")?.short_name?.replace(/\s/g, "");
  if (postal && postal !== address.postcode) return null;

  const lat = result.geometry?.location?.lat;
  const lng = result.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  return { lat, lng };
}

export async function estimateImmediateDispatchFeeFromAddress(
  input: DeliveryAddressInput
): Promise<ImmediateDispatchQuote | null> {
  const coords = await geocodeAddress(input);
  if (!coords) return null;
  return feeFromCoords(coords.lat, coords.lng);
}

export const quoteImmediateDispatch = onCall(
  { secrets: [googleMapsApiKey], invoker: "public" },
  async (request) => {
    const data = (request.data || {}) as Record<string, unknown>;
    const address = normalizeDeliveryAddress(data);
    if (!address) {
      throw new HttpsError("invalid-argument", "A complete NSW street address is required.");
    }

    try {
      const quote = await estimateImmediateDispatchFeeFromAddress(address);
      if (!quote) {
        throw new HttpsError("failed-precondition", "Immediate Dispatch is not available for this address.");
      }
      return quote;
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      logger.error("Immediate Dispatch quote failed", err);
      throw new HttpsError("unavailable", "Could not price Immediate Dispatch right now.");
    }
  }
);
