import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { CalendarX, LogIn, MapPin, Video } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PressableScale } from '@/components/PressableScale';
import { Segmented } from '@/components/Segmented';
import { Skeleton } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { useAuth } from '@/lib/auth';
import { anuleazaProgramare, programarileMele } from '@/lib/data';
import { eroareText, formatDataLunga, formatOra } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import { colors, fonts, radius } from '@/lib/theme';
import type { ProgramareDetaliata } from '@/lib/types';

type Filtru = 'viitoare' | 'trecute';

export default function Programari() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const [filtru, setFiltru] = useState<Filtru>('viitoare');
  const { data, loading, error, refreshing, refresh, reload } = useAsync(
    async () => ({ lista: session ? await programarileMele() : [], la: Date.now() }),
    [session?.user.id],
  );

  // reîncarcă la revenirea pe tab (ex. după o programare nouă)
  useFocusEffect(
    useCallback(() => {
      if (session) reload(true);
    }, [session, reload]),
  );

  const lista = useMemo(() => {
    const now = data?.la ?? 0;
    const all = data?.lista ?? [];
    return filtru === 'viitoare'
      ? all.filter((p) => new Date(p.end_at).getTime() > now)
      : all.filter((p) => new Date(p.end_at).getTime() <= now).reverse();
  }, [data, filtru]);

  const anuleaza = (p: ProgramareDetaliata) => {
    Alert.alert('Anulezi programarea?', `${formatDataLunga(p.start_at)}, ${formatOra(p.start_at)}`, [
      { text: 'Nu', style: 'cancel' },
      {
        text: 'Anulează programarea',
        style: 'destructive',
        onPress: async () => {
          try {
            await anuleazaProgramare(p.id);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            reload(true);
          } catch (e) {
            Alert.alert('Nu s-a putut anula', eroareText(e));
          }
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={[s.top, { paddingTop: insets.top + 12 }]}>
        <Text variant="title">Programări</Text>
        {session && (
          <Segmented
            options={[
              { value: 'viitoare', label: 'Viitoare' },
              { value: 'trecute', label: 'Trecute' },
            ]}
            value={filtru}
            onChange={setFiltru}
          />
        )}
      </View>

      {!session ? (
        <EmptyState
          icon={<LogIn size={36} color={colors.accent} />}
          title="Programările tale"
          text="Intră în cont ca să-ți vezi programările."
          action={<Button title="Intră în cont" onPress={() => router.push('/auth/login')} />}
        />
      ) : loading ? (
        <View style={s.list}>
          <Skeleton height={140} radius={radius.card} />
          <Skeleton height={140} radius={radius.card} />
        </View>
      ) : (
        <FlatList
          data={lista}
          keyExtractor={(p) => p.id}
          contentContainerStyle={[s.list, { paddingBottom: 32 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          ListHeaderComponent={error ? <Text variant="small">{eroareText(error)}</Text> : undefined}
          ListEmptyComponent={
            <EmptyState
              icon={<CalendarX size={36} color={colors.muted} />}
              title={filtru === 'viitoare' ? 'Nicio programare viitoare' : 'Nicio programare trecută'}
              text={filtru === 'viitoare' ? 'Găsește un avocat sau un notar și alege o oră.' : undefined}
              action={
                filtru === 'viitoare' ? (
                  <Button title="Caută" variant="outline" onPress={() => router.navigate('/cauta')} />
                ) : undefined
              }
            />
          }
          renderItem={({ item }) => (
            <ProgramareCard p={item} onCancel={filtru === 'viitoare' ? () => anuleaza(item) : undefined} />
          )}
        />
      )}
    </View>
  );
}

function ProgramareCard({ p, onCancel }: { p: ProgramareDetaliata; onCancel?: () => void }) {
  const anulabila = onCancel && (p.status === 'in_asteptare' || p.status === 'confirmata');
  return (
    <PressableScale
      style={s.card}
      onPress={() => p.cabinete && router.push({ pathname: '/cabinet/[id]', params: { id: p.cabinete.id } })}
      accessibilityRole="button"
    >
      <View style={s.cardHead}>
        <View style={{ flex: 1 }}>
          <Text style={s.date}>{formatDataLunga(p.start_at)}</Text>
          <Text style={s.time}>
            {formatOra(p.start_at)} – {formatOra(p.end_at)}
          </Text>
        </View>
        <StatusBadge status={p.status} />
      </View>
      <View style={{ gap: 2 }}>
        <Text variant="bodyBold">{p.cabinete?.nume}</Text>
        <Text variant="small">
          {[p.profesionisti?.nume, p.servicii?.nume].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <View style={s.mod}>
        {p.mod === 'video' ? <Video size={14} color={colors.muted} /> : <MapPin size={14} color={colors.muted} />}
        <Text variant="small">{p.mod === 'video' ? 'Întâlnire video' : p.cabinete?.adresa}</Text>
      </View>
      {anulabila && <Button title="Anulează" variant="danger" onPress={onCancel} style={{ minHeight: 44 }} />}
    </PressableScale>
  );
}

const s = StyleSheet.create({
  top: { paddingHorizontal: 20, gap: 14, paddingBottom: 4 },
  list: { padding: 20, gap: 12 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  date: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  time: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: colors.text },
  mod: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
