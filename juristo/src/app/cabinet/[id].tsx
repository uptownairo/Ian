import { router, useLocalSearchParams } from 'expo-router';
import { BadgeCheck, Clock, Video } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { GoogleReviews } from '@/components/GoogleReviews';
import { MapCard } from '@/components/MapCard';
import { Skeleton } from '@/components/Skeleton';
import { SocialButtons } from '@/components/SocialButtons';
import { Text } from '@/components/Text';
import { getCabinet } from '@/lib/data';
import { eroareText } from '@/lib/format';
import { pretAfisat } from '@/lib/pret';
import { useAsync, useGooglePlace } from '@/lib/hooks';
import { colors, fonts, radius } from '@/lib/theme';

export default function CabinetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data: cabinet, loading, error } = useAsync(() => getCabinet(id), [id]);
  const { place, loading: placeLoading } = useGooglePlace(cabinet?.google_place_id);

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[s.header, { paddingTop: insets.top + 56 }]}>
          <Skeleton width={84} height={84} radius={26} style={{ opacity: 0.3 }} />
          <Skeleton width={200} height={26} style={{ opacity: 0.3 }} />
        </View>
        <View style={{ padding: 20, gap: 12 }}>
          <Skeleton height={64} />
          <Skeleton height={180} radius={radius.card} />
        </View>
      </View>
    );
  }

  if (error || !cabinet) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top + 56 }}>
        <EmptyState
          title="Cabinet indisponibil"
          text={error ? eroareText(error) : 'Cabinetul nu există sau nu este încă verificat.'}
          action={<Button title="Înapoi" variant="outline" onPress={() => router.back()} />}
        />
      </View>
    );
  }

  const pro = cabinet.profesionisti[0];
  const ratingText = cabinet.google_place_id
    ? placeLoading
      ? null
      : place?.rating
        ? place.rating.toFixed(1).replace('.', ',')
        : '–'
    : '–';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <View style={[s.header, { paddingTop: insets.top + 56 }]}>
          <Avatar nume={pro?.nume ?? cabinet.nume} uri={pro?.poza_url} size={84} tone="navy" />
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Text variant="h2" style={{ color: '#FFFFFF', textAlign: 'center' }}>
              {pro?.nume ?? cabinet.nume}
            </Text>
            <Text style={s.subtitle}>{pro?.titlu ?? cabinet.nume}</Text>
            {pro && pro.nume !== cabinet.nume && <Text style={s.subtitle}>{cabinet.nume}</Text>}
          </View>
          <View style={s.verified}>
            <BadgeCheck size={14} color="#9FB4FF" />
            <Text style={s.verifiedText}>
              Verificat în {cabinet.tip === 'notar' ? 'evidența UNNPR' : 'Tabloul avocaților'}
            </Text>
          </View>

          <View style={s.stats}>
            <Stat
              value={ratingText}
              label="Rating Google"
              loading={!!cabinet.google_place_id && placeLoading}
            />
            <Stat value={pro?.ani_experienta != null ? `${pro.ani_experienta}` : '–'} label="Ani experiență" />
            <Stat value={pro?.limbi.join(' · ') || 'RO'} label="Limbi" />
          </View>
        </View>

        <View style={s.body}>
          <SocialButtons cabinet={cabinet} />

          <GoogleReviews placeId={cabinet.google_place_id} />

          {cabinet.descriere && (
            <Section title="Despre">
              <Text variant="body" style={{ color: colors.muted }}>
                {cabinet.descriere}
              </Text>
              {pro && pro.specializari.length > 0 && (
                <View style={s.tags}>
                  {pro.specializari.map((t) => (
                    <View key={t} style={s.tag}>
                      <Text style={s.tagText}>{t}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Section>
          )}

          {cabinet.servicii.length > 0 && (
            <Section title="Servicii">
              {cabinet.servicii.map((sv, i) => {
                const pret = pretAfisat(sv, cabinet.tip);
                return (
                  <View key={sv.id} style={[s.service, i > 0 && s.serviceBorder]}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text variant="bodyBold">{sv.nume}</Text>
                      <View style={s.serviceMeta}>
                        <Clock size={13} color={colors.muted} />
                        <Text variant="small">{sv.durata_min} min</Text>
                        {sv.video_ok && (
                          <>
                            <Video size={13} color={colors.muted} />
                            <Text variant="small">și video</Text>
                          </>
                        )}
                      </View>
                    </View>
                    {pret && <Text style={s.price}>{pret}</Text>}
                  </View>
                );
              })}
            </Section>
          )}

          <View style={{ gap: 10 }}>
            <Text variant="label">Locație</Text>
            <MapCard cabinet={cabinet} />
          </View>
        </View>
      </ScrollView>

      <View style={[s.cta, { paddingBottom: insets.bottom + 12 }]}>
        <Button
          title="Programează o consultație"
          onPress={() => router.push({ pathname: '/programare/[cabinetId]', params: { cabinetId: cabinet.id } })}
          disabled={cabinet.servicii.length === 0 || cabinet.profesionisti.length === 0}
        />
      </View>
    </View>
  );
}

function Stat({ value, label, loading }: { value: string | null; label: string; loading?: boolean }) {
  return (
    <View style={s.stat}>
      {loading || value == null ? (
        <Skeleton width={36} height={22} style={{ opacity: 0.3 }} />
      ) : (
        <Text style={s.statValue} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
      )}
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text variant="label">{title}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: colors.navy,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  subtitle: { fontFamily: fonts.semibold, fontSize: 14, color: colors.onNavyMuted, textAlign: 'center' },
  verified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.navySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  verifiedText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.onNavy },
  stats: { flexDirection: 'row', gap: 8, alignSelf: 'stretch' },
  stat: {
    flex: 1,
    backgroundColor: colors.navySoft,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontFamily: fonts.extrabold, fontSize: 18, color: '#FFFFFF' },
  statLabel: { fontFamily: fonts.semibold, fontSize: 11, color: colors.onNavyMuted, textAlign: 'center' },
  body: { padding: 20, gap: 20 },
  section: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { backgroundColor: colors.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
  service: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 4 },
  serviceBorder: { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 },
  serviceMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { fontFamily: fonts.bold, fontSize: 13, color: colors.text, maxWidth: '45%', textAlign: 'right' },
  cta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
