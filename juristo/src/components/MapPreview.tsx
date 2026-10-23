import { Platform } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

import { mapsUrl, open } from '@/lib/links';
import { colors } from '@/lib/theme';
import type { Cabinet } from '@/lib/types';

/** Pin fix pe lat/lng; harta nu se mișcă, iar la apăsare se deschide Google Maps. */
export function MapPreview({ cabinet }: { cabinet: Cabinet }) {
  const coord = { latitude: cabinet.lat!, longitude: cabinet.lng! };
  return (
    <MapView
      style={{ height: 180, width: '100%' }}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      initialRegion={{ ...coord, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
      scrollEnabled={false}
      zoomEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      toolbarEnabled={false}
      onPress={() => open(mapsUrl(cabinet))}
      accessibilityLabel={`Hartă: ${cabinet.adresa}. Apasă pentru Google Maps.`}
    >
      <Marker coordinate={coord} draggable={false} pinColor={colors.accent} onPress={() => open(mapsUrl(cabinet))} />
    </MapView>
  );
}
