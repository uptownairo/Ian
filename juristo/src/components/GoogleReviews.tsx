import { Image } from 'expo-image';
import { ExternalLink } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { useGooglePlace } from '@/lib/hooks';
import { open } from '@/lib/links';
import { colors, fonts, radius } from '@/lib/theme';

import { Avatar } from './Avatar';
import { PressableScale } from './PressableScale';
import { RatingStars } from './RatingStars';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

/**
 * Recenzii Google, cerute live prin Edge Function `google-place`.
 * Nimic nu se salvează în baza de date (termenii Google). Maximum 5 recenzii.
 */
export function GoogleReviews({ placeId }: { placeId: string | null }) {
  const { place, loading } = useGooglePlace(placeId);

  if (!placeId) return null;
  if (!loading && !place) return null;

  return (
    <View style={s.card}>
      <View style={s.header}>
        <Text variant="label">Recenzii Google</Text>
        <GoogleWordmark />
      </View>

      {loading || !place ? (
        <View style={{ gap: 12 }}>
          <Skeleton width={120} height={40} />
          <Skeleton height={14} />
          <Skeleton width="80%" height={14} />
          <Skeleton width="60%" height={14} />
        </View>
      ) : (
        // Conținutul înlocuiește skeleton-ul cu un fade scurt, ca să nu „sară”.
        <Animated.View entering={FadeIn.duration(200)} style={{ gap: 16 }}>
          <View style={s.summary}>
            <Text style={s.big}>{place.rating ? place.rating.toFixed(1).replace('.', ',') : '–'}</Text>
            <View style={{ gap: 4 }}>
              {place.rating != null && <RatingStars value={place.rating} size={16} />}
              <Text variant="small">{place.total} recenzii pe Google</Text>
            </View>
          </View>

          {place.reviews.slice(0, 5).map((r, i) => (
            <View key={`${r.autor}-${i}`} style={s.review}>
              <View style={s.reviewHead}>
                {r.poza ? (
                  <Image source={{ uri: r.poza }} style={s.authorPic} />
                ) : (
                  <Avatar nume={r.autor} size={32} />
                )}
                <View style={{ flex: 1 }}>
                  <Text variant="bodyBold" numberOfLines={1}>
                    {r.autor}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {r.stele != null && <RatingStars value={r.stele} size={12} />}
                    <Text variant="small">{r.cand}</Text>
                  </View>
                </View>
              </View>
              {!!r.text && (
                <Text variant="body" numberOfLines={6} style={{ color: colors.muted }}>
                  {r.text}
                </Text>
              )}
            </View>
          ))}

          {place.mapsUrl && (
            <PressableScale
              style={s.link}
              onPress={() => open(place.mapsUrl!)}
              accessibilityRole="link"
            >
              <Text style={s.linkText}>Vezi toate recenziile pe Google</Text>
              <ExternalLink size={16} color={colors.accent} />
            </PressableScale>
          )}
        </Animated.View>
      )}
    </View>
  );
}

function GoogleWordmark() {
  const letters: [string, string][] = [
    ['G', '#4285F4'],
    ['o', '#EA4335'],
    ['o', '#FBBC05'],
    ['g', '#4285F4'],
    ['l', '#34A853'],
    ['e', '#EA4335'],
  ];
  return (
    <Text accessibilityLabel="Google" style={{ fontFamily: fonts.bold, fontSize: 15 }}>
      {letters.map(([l, c], i) => (
        <Text key={i} style={{ color: c, fontFamily: fonts.bold, fontSize: 15 }}>
          {l}
        </Text>
      ))}
    </Text>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 16,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  big: { fontFamily: fonts.serif, fontSize: 44, lineHeight: 50, color: colors.text },
  review: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  authorPic: { width: 32, height: 32, borderRadius: 16 },
  link: {
    minHeight: 48,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  linkText: { fontFamily: fonts.bold, fontSize: 15, color: colors.accent },
});
