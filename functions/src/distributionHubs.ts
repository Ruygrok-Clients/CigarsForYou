/** Keep in sync with src/constants/distributionHubs.ts */

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
    id: "pymble",
    label: "Pymble",
    street: "12 Pymble Ave",
    suburb: "Pymble",
    state: "NSW",
    postcode: "2073",
    country: "Australia",
  },
];

export function getDistributionHub(id: string | undefined | null): DistributionHub | undefined {
  if (!id) return undefined;
  return DISTRIBUTION_HUBS.find((hub) => hub.id === id);
}
