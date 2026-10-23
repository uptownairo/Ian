import { MapPin, Navigation } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { directionsUrl, mapsUrl, open } from '@/lib/links';
import { colors, radius } from '@/lib/theme';
import type { Cabinet } from '@/lib/types';

import { Button } from './Button';
import { MapPreview } from './MapPreview';
import { Text } from './Text';

/** Hartă statică (pin fix); la apăsare se deschide Google Maps. */
export function MapCard({ cabinet }: { cabinet: Cabinet }) {
  const hasCoords = cabinet.lat != null && cabinet.lng != null;

  return (
    <View style={s.card}>
      {hasCoords && <MapPreview cabinet={cabinet} />}
      <View style={s.body}>
        <View style={s.addr}>
          <MapPin size={18} color={colors.muted} />
          <Text variant="bodyBold" style={{ flex: 1 }}>
            {cabinet.adresa}, {cabinet.oras}
          </Text>
        </View>
        <View style={s.buttons}>
          <Button
            title="Deschide în Maps"
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => open(mapsUrl(cabinet))}
          />
          <Button
            title="Indicații rutiere"
            variant="navy"
            style={{ flex: 1 }}
            icon={<Navigation size={16} color="#FFFFFF" />}
            onPress={() => open(directionsUrl(cabinet))}
          />
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  body: { padding: 16, gap: 12 },
  addr: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  buttons: { flexDirection: 'row', gap: 8 },
});
