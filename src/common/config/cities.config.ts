export const CITIES = {
  Saskatoon: {
    timeZone: 'America/Regina',
    countryCode: 'CA',
    state: 'SK',
  },
  Regina: {
    timeZone: 'America/Regina',
    countryCode: 'CA',
    state: 'SK',
  },
} as const;

export type City = keyof typeof CITIES;
