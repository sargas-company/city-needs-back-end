export const CITIES = {
  Saskatoon: {
    timeZone: 'America/Regina',
    countryCode: 'CA',
    state: 'SK',
    center: {
      lat: 52.1332,
      // eslint-disable-next-line prettier/prettier
      lng: -106.6700,
    },
    autocompleteRadiusMeters: 30_000,
  },
  Regina: {
    timeZone: 'America/Regina',
    countryCode: 'CA',
    state: 'SK',
    center: {
      lat: 50.4452,
      lng: -104.6189,
    },
    autocompleteRadiusMeters: 20_000,
  },
} as const;

export type City = keyof typeof CITIES;
