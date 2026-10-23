import { router } from 'expo-router';
import { BadgeCheck, MapPin, Star } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { formatDistanta, formatSlotScurt } from '@/lib/format';
import { useGooglePlace } from '@/lib/hooks';
import { colors, fonts, radius, shadow } from '@/lib/theme';
import type { CabinetCuProfesionisti } from '@/lib/types';

import { Avatar } from './Avatar';
import { PressableScale } from './PressableScale';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

export function CabinetCard({
  cabinet,
  distantaKm,
  slotAzi,
}: {
  cabinet: CabinetCuProfesionisti;
  distantaKm?: number;
  slotAzi?: string | null;
}) {
  const pro = cabinet.profesionisti[0];
  const { place, loading } = useGooglePlace(cabinet.google_place_id);

  return (
    <PressableScale
      style={s.card}
      onPress={() => router.push({ pathname: '/cabinet/[id]', params: { id: cabinet.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${cabinet.nume}, ${pro?.titlu ?? ''}`}
    >
      <View style={s.row}>
        <Avatar nume={pro?.nume ?? cabinet.nume} uri={pro?.poza_url} />
        <View style={{ flex: 1, gap: 2 }}>
          <View style={s.nameRow}>
            <Text variant="h3" numberOfLines={1} style={{ flexShrink: 1 }}>
              {pro?.nume ?? cabinet.nume}
            </Text>
            <BadgeCheck size={16} color={colors.accent} accessibilityLabel="Verificat" />
            {cabinet.google_place_id &&
              (loading ? (
                <Skeleton width={36} height={14} />
              ) : place?.rating ? (
                <View style={s.rating} accessibilityLabel={`Rating Google ${place.rating.toFixed(1)}`}>
                  <Star size={13} color={colors.star} fill={colors.star} />
                  <Text style={s.ratingText}>{place.rating.toFixed(1).replace('.', ',')}</Text>
                </View>
              ) : null)}
          </View>
          <Text variant="small" numberOfLines={1}>
            {pro?.titlu ?? cabinet.nume}
          </Text>
        </View>
      </View>

      <View style={s.meta}>
        <View style={s.metaItem}>
          <MapPin size={14} color={colors.muted} />
          <Text variant="small" numberOfLines={1} style={{ flexShrink: 1 }}>
            {[cabinet.zona, distantaKm != null ? formatDistanta(distantaKm) : null].filter(Boolean).join(' · ')}
          </Text>
        </View>
        {slotAzi && (
          <View style={s.slot}>
            <Text style={s.slotText}>{formatSlotScurt(slotAzi)}</Text>
          </View>
        )}
      </View>

      {pro && pro.specializari.length > 0 && (
        <View style={s.tags}>
          {pro.specializari.slice(0, 3).map((t) => (
            <View key={t} style={s.tag}>
              <Text style={s.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      )}
    </PressableScale>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow,
  },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  ratingText: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, flexShrink: 1 },
  slot: { backgroundColor: colors.successBg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  slotText: { fontFamily: fonts.bold, fontSize: 12, color: colors.success },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
});
