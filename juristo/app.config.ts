import type { ConfigContext, ExpoConfig } from 'expo/config';

// Cheia Google Maps (doar Maps SDK) vine din .env → EXPO_PUBLIC_GOOGLE_MAPS_KEY
export default ({ config }: ConfigContext): ExpoConfig => {
  const mapsKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY;
  return {
    ...(config as ExpoConfig),
    ios: {
      ...config.ios,
      config: { ...config.ios?.config, ...(mapsKey ? { googleMapsApiKey: mapsKey } : {}) },
    },
    android: {
      ...config.android,
      config: { ...config.android?.config, ...(mapsKey ? { googleMaps: { apiKey: mapsKey } } : {}) },
    },
  };
};
