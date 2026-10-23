import { MapPin } from 'lucide-react-native';
import { Pressable } from 'react-native';

import { mapsUrl, open } from '@/lib/links';
import { colors } from '@/lib/theme';
import type { Cabinet } from '@/lib/types';

// react-native-maps nu rulează pe web: arătăm un placeholder care deschide Google Maps.
export function MapPreview({ cabinet }: { cabinet: Cabinet }) {
  return (
    <Pressable
      onPress={() => open(mapsUrl(cabinet))}
      accessibilityRole="link"
      style={{ height: 180, backgroundColor: '#E7ECFB', alignItems: 'center', justifyContent: 'center' }}
    >
      <MapPin size={32} color={colors.accent} />
    </Pressable>
  );
}
