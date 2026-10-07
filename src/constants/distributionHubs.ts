import type { Address } from '../types';

export interface DistributionHub {
  id: string;
  label: string;
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}

export const DISTRIBUTION_HUBS: DistributionHub[] = [
  {
    id: 'pymble',
    label: 'Pymble',
    street: '12 Pymble Ave',
    suburb: 'Pymble',
    state: 'NSW',
    postcode: '2073',
    country: 'Australia',
  },
];

export const DEFAULT_DISTRIBUTION_HUB_ID = DISTRIBUTION_HUBS[0].id;

export function getDistributionHub(id: string | undefined | null): DistributionHub | undefined {
  if (!id) return undefined;
  return DISTRIBUTION_HUBS.find((hub) => hub.id === id);
}

export function hubAddress(hub: DistributionHub): Address {
  return {
    id: hub.id,
    street: hub.street,
    suburb: hub.suburb,
    state: hub.state,
    postcode: hub.postcode,
    country: hub.country,
  };
}

/** Single line suitable for clipboard and compact display. */
export function formatHubAddressLine(hub: DistributionHub): string {
  return `${hub.street}, ${hub.suburb} ${hub.state} ${hub.postcode}`;
}

export function formatHubMapsQuery(hub: DistributionHub): string {
  return encodeURIComponent(`${hub.street}, ${hub.suburb} ${hub.state} ${hub.postcode}, ${hub.country}`);
}
