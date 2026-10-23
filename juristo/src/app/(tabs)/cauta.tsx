import { useLocalSearchParams } from 'expo-router';
import { Search, SearchX, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CabinetCard } from '@/components/CabinetCard';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { Segmented } from '@/components/Segmented';
import { Skeleton } from '@/components/Skeleton';
import { Text } from '@/components/Text';
import { listCabinete } from '@/lib/data';
import { distantaKm, eroareText } from '@/lib/format';
import { useAsync, useLocatie } from '@/lib/hooks';
import { colors, fonts, radius } from '@/lib/theme';
import type { CabinetCuProfesionisti, TipProfesie } from '@/lib/types';

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// Reflow-ul listei la filtrare: 200ms, ca rândurile rămase să nu „sară” în locul celor scoase.
const reflow = LinearTransition.duration(200);

export default function Cauta() {
  const params = useLocalSearchParams<{ tip?: TipProfesie; spec?: string; q?: string }>();
  const insets = useSafeAreaInsets();
  const [tip, setTip] = useState<TipProfesie>(params.tip === 'notar' ? 'notar' : 'avocat');
  const [spec, setSpec] = useState<string | null>(params.spec ?? null);
  const [q, setQ] = useState(params.q ?? '');
  const { pos } = useLocatie();

  // Chip-urile de pe Acasă re-deschid tab-ul cu alți parametri: resetăm filtrele
  // (pattern-ul React „ajustează starea când se schimbă props”, fără efect)
  const paramsKey = `${params.tip}|${params.spec}|${params.q}`;
  const [seenKey, setSeenKey] = useState(paramsKey);
  if (seenKey !== paramsKey) {
    setSeenKey(paramsKey);
    if (params.tip === 'avocat' || params.tip === 'notar') setTip(params.tip);
    setSpec(params.spec ?? null);
    setQ(params.q ?? '');
  }

  const { data, loading, error, refreshing, refresh } = useAsync(() => listCabinete(tip), [tip]);

  const specializari = useMemo(() => {
    const set = new Set<string>();
    data?.forEach((c) => c.profesionisti.forEach((p) => p.specializari.forEach((x) => set.add(x))));
    if (spec) set.add(spec);
    return [...set].sort((a, b) => a.localeCompare(b, 'ro'));
  }, [data, spec]);

  // Sortare implicită după distanță (fără clasamente — regulile UNBR)
  const rezultate = useMemo(() => {
    if (!data) return [];
    const needle = normalize(q.trim());
    return data
      .filter((c) => !spec || c.profesionisti.some((p) => p.specializari.includes(spec)))
      .filter((c) => !needle || normalize(haystack(c)).includes(needle))
      .map((c) => ({
        c,
        km: c.lat != null && c.lng != null ? distantaKm(pos, { lat: c.lat, lng: c.lng }) : undefined,
      }))
      .sort((a, b) => (a.km ?? 99) - (b.km ?? 99));
  }, [data, spec, q, pos]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[s.top, { paddingTop: insets.top + 12 }]}>
        <Text variant="title">Caută</Text>
        <View style={s.search}>
          <Search size={20} color={colors.muted} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Nume, zonă sau problemă"
            placeholderTextColor={colors.muted}
            style={s.searchInput}
            returnKeyType="search"
            accessibilityLabel="Caută"
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ('')} hitSlop={12} accessibilityLabel="Șterge căutarea">
              <X size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
        <Segmented
          options={[
            { value: 'avocat', label: 'Avocați' },
            { value: 'notar', label: 'Notari' },
          ]}
          value={tip}
          onChange={(v) => {
            setTip(v);
            setSpec(null);
          }}
        />
      </View>

      <View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
        >
          <Chip label="Toate" selected={!spec} onPress={() => setSpec(null)} />
          {specializari.map((x) => (
            <Chip key={x} label={x} selected={spec === x} onPress={() => setSpec(spec === x ? null : x)} />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.list}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={128} radius={radius.card} />
          ))}
        </View>
      ) : (
        <Animated.FlatList
          data={rezultate}
          keyExtractor={(r) => r.c.id}
          itemLayoutAnimation={reflow}
          contentContainerStyle={[s.list, { paddingBottom: 32 }]}
          keyboardDismissMode="on-drag"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListHeaderComponent={
            error ? (
              <Text variant="small">{eroareText(error)}</Text>
            ) : (
              <Text variant="small">
                {rezultate.length} {rezultate.length === 1 ? 'rezultat' : 'rezultate'} · sortate după distanță
              </Text>
            )
          }
          ListEmptyComponent={
            error ? undefined : (
              <EmptyState
                icon={<SearchX size={36} color={colors.muted} />}
                title="Niciun rezultat"
                text="Încearcă altă specializare sau șterge căutarea."
              />
            )
          }
          renderItem={({ item }) => <CabinetCard cabinet={item.c} distantaKm={item.km} />}
        />
      )}
    </View>
  );
}

function haystack(c: CabinetCuProfesionisti) {
  return [
    c.nume,
    c.descriere,
    c.zona,
    c.adresa,
    ...c.profesionisti.flatMap((p) => [p.nume, p.titlu, ...p.specializari]),
  ]
    .filter(Boolean)
    .join(' ');
}

const s = StyleSheet.create({
  top: { paddingHorizontal: 20, gap: 14, paddingBottom: 12 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    minHeight: 50,
  },
  searchInput: { flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.text, paddingVertical: 12 },
  chips: { paddingHorizontal: 20, paddingVertical: 4, gap: 8 },
  list: { padding: 20, gap: 12 },
});
