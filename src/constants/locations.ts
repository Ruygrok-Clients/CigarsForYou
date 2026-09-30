export interface AustralianState {
  code: string;
  name: string;
  available: boolean;
}

export const AUSTRALIAN_STATES: AustralianState[] = [
  { code: 'NSW', name: 'New South Wales (Available)', available: true },
  { code: 'VIC', name: 'Victoria (Coming Soon)', available: false },
  { code: 'QLD', name: 'Queensland (Coming Soon)', available: false },
  { code: 'WA', name: 'Western Australia (Coming Soon)', available: false },
  { code: 'SA', name: 'South Australia (Coming Soon)', available: false },
  { code: 'TAS', name: 'Tasmania (Coming Soon)', available: false },
  { code: 'ACT', name: 'ACT (Coming Soon)', available: false },
  { code: 'NT', name: 'Northern Territory (Coming Soon)', available: false }
];
