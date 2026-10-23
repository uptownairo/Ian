import { router } from 'expo-router';
import { ArrowRight, Gavel, MapPin, Scale, Search, Stamp } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CabinetCard } from '@/components/CabinetCard';
import { Chip } from '@/components/Chip';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { listCabinete, primulSlotAzi } from '@/lib/data';
import { distantaKm, eroareText, ziRomania } from '@/lib/format';
import { useAsync, useLocatie } from '@/lib/hooks';
import { chipuriRapide } from '@/lib/specializari';
import { colors, fonts, radius } from '@/lib/theme';
import type { TipProfesie } from '@/lib/types';

export default function Acasa() {
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');
  const { pos } = useLocatie();
  const { data, loading, error, refreshing, refresh } = useAsync(() => listCabinete(), []);
  const [sloturi, setSloturi] = useState<Record<string, string | null>>({});

  // „Disponibili azi”: primul slot liber de azi, din sloturi_libere (nu calculat în aplicație)
  useEffect(() => {
    if (!data) return;
    let alive = true;
    const zi = ziRomania();
    Promise.all(
      data.map(async (c) => {
        const pro = c.profesionisti[0];
        return [c.id, pro ? await primulSlotAzi(pro.id, zi) : null] as const;
      }),
    ).then((rows) => alive && setSloturi(Object.fromEntries(rows)));
    return () => {
      alive = false;
    };
  }, [data]);

  const disponibili = useMemo(() => {
    if (!data) return [];
    return data
      .filter((c) => sloturi[c.id])
      .map((c) => ({
        c,
        km: c.lat != null && c.lng != null ? distantaKm(pos, { lat: c.lat, lng: c.lng }) : undefined,
      }))
      .sort((a, b) => (a.km ?? 99) - (b.km ?? 99))
      .slice(0, 5);
  }, [data, sloturi, pos]);

  const deschideCauta = (params: { tip?: TipProfesie; spec?: string; q?: string }) =>
    router.navigate({ pathname: '/cauta', params });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#FFFFFF" />}
    >
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.brandRow}>
          <View style={s.brand}>
            <View style={s.logo}>
              <Scale size={18} color="#FFFFFF" />
            </View>
            <Text style={s.brandText}>Juristo</Text>
          </View>
          <View style={s.city}>
            <MapPin size={14} color={colors.onNavyMuted} />
            <Text style={s.cityText}>Cluj-Napoca</Text>
          </View>
        </View>

        <Text variant="title" style={s.headline}>
          Avocați și notari, programați în câteva minute
        </Text>

        <View style={s.search}>
          <Search size={20} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Caută după nume sau problemă"
            placeholderTextColor={colors.muted}
            style={s.searchInput}
            returnKeyType="search"
            onSubmitEditing={() => deschideCauta({ q: q.trim() })}
            accessibilityLabel="Caută"
          />
        </View>
      </View>

      <View style={s.body}>
        <View style={s.bigRow}>
          <PressableScale
            style={[s.big, { backgroundColor: colors.accent }]}
            onPress={() => deschideCauta({ tip: 'avocat' })}
            accessibilityRole="button"
            accessibilityLabel="Avocați"
          >
            <Gavel size={26} color="#FFFFFF" />
            <View>
              <Text style={[s.bigTitle, { color: '#FFFFFF' }]}>Avocați</Text>
              <Text style={[s.bigSub, { color: '#DCE3FB' }]}>Consultanță și instanță</Text>
            </View>
            <ArrowRight size={18} color="#FFFFFF" style={s.bigArrow} />
          </PressableScale>
          <PressableScale
            style={[s.big, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => deschideCauta({ tip: 'notar' })}
            accessibilityRole="button"
            accessibilityLabel="Notari"
          >
            <Stamp size={26} color={colors.navy} />
            <View>
              <Text style={s.bigTitle}>Notari</Text>
              <Text style={s.bigSub}>Acte, procuri, succesiuni</Text>
            </View>
            <ArrowRight size={18} color={colors.navy} style={s.bigArrow} />
          </PressableScale>
        </View>

        <View style={{ gap: 10 }}>
          <Text variant="label">Ai nevoie de</Text>
          <View style={s.chips}>
            {chipuriRapide.map((c) => (
              <Chip key={c.label} label={c.label} onPress={() => deschideCauta({ tip: c.tip, spec: c.spec })} />
            ))}
          </View>
        </View>

        <View style={{ gap: 12 }}>
          <Text variant="h2">Disponibili azi, lângă tine</Text>
          {loading ? (
            <>
              <Skeleton height={128} radius={radius.card} />
              <Skeleton height={128} radius={radius.card} />
            </>
          ) : error ? (
            <Text variant="small">{eroareText(error)}</Text>
          ) : disponibili.length === 0 ? (
            <Text variant="small">
              Nu mai sunt ore libere azi. Vezi lista completă în Caută pentru zilele următoare.
            </Text>
          ) : (
            disponibili.map(({ c, km }) => (
              <CabinetCard key={c.id} cabinet={c} distantaKm={km} slotAzi={sloturi[c.id]} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  header: {
    backgroundColor: colors.navy,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    gap: 18,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { fontFamily: fonts.extrabold, fontSize: 18, color: '#FFFFFF' },
  city: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.navySoft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  cityText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.onNavy },
  headline: { color: '#FFFFFF' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.input,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 12 },
  body: { padding: 20, gap: 24 },
  bigRow: { flexDirection: 'row', gap: 12 },
  big: { flex: 1, flexBasis: 0, borderRadius: radius.card, padding: 16, gap: 18, minHeight: 140 },
  bigTitle: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: colors.text },
  bigSub: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  bigArrow: { position: 'absolute', top: 16, right: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
