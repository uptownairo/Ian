import { router, useLocalSearchParams } from 'expo-router';
import { Building2, CalendarClock, Check, MapPin, User, Video } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Skeleton';
import { StatusBadge } from '@/components/StatusBadge';
import { Text } from '@/components/Text';
import { getProgramare } from '@/lib/data';
import { formatDataLunga, formatOra } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import { EASE_OUT } from '@/lib/motion';
import { colors, radius } from '@/lib/theme';

// Momentul rar al aplicației: bifa intră din 0.9 + opacitate, 320ms ease-out.
// Haptic-ul de succes a fost dat deja în momentul confirmării (același cadru cu răspunsul serverului).
const pop: CSSAnimationKeyframes = {
  from: { opacity: 0, transform: [{ scale: 0.9 }] },
  to: { opacity: 1, transform: [{ scale: 1 }] },
};
const fade: CSSAnimationKeyframes = {
  from: { opacity: 0 },
  to: { opacity: 1 },
};

export default function Confirmare() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reduced = useReducedMotion();
  const { data: p, loading } = useAsync(() => getProgramare(id), [id]);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 48 }}>
      <View style={{ alignItems: 'center', gap: 12, paddingTop: 12 }}>
        <Animated.View
          style={[
            s.badge,
            {
              animationName: reduced ? fade : pop,
              animationDuration: 320,
              animationTimingFunction: EASE_OUT,
              animationFillMode: 'both',
            },
          ]}
        >
          <Check size={40} color="#FFFFFF" strokeWidth={3} />
        </Animated.View>
        <Text variant="title" style={{ textAlign: 'center' }}>
          Cerere trimisă
        </Text>
        <Text variant="body" style={{ textAlign: 'center', color: colors.muted }}>
          Cabinetul confirmă sau refuză programarea. Statusul îl vezi oricând în tab-ul Programări.
        </Text>
      </View>

      {loading ? (
        <Skeleton height={200} radius={radius.card} />
      ) : p ? (
        <View style={s.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="label">Rezumat</Text>
            <StatusBadge status={p.status} />
          </View>
          <Row icon={<CalendarClock size={18} color={colors.muted} />}>
            {formatDataLunga(p.start_at)}, {formatOra(p.start_at)}–{formatOra(p.end_at)}
          </Row>
          {p.cabinete && <Row icon={<Building2 size={18} color={colors.muted} />}>{p.cabinete.nume}</Row>}
          {p.profesionisti && <Row icon={<User size={18} color={colors.muted} />}>{p.profesionisti.nume}</Row>}
          {p.servicii && (
            <Row icon={<Check size={18} color={colors.muted} />}>
              {p.servicii.nume} · {p.servicii.durata_min} min
            </Row>
          )}
          <Row
            icon={
              p.mod === 'video' ? (
                <Video size={18} color={colors.muted} />
              ) : (
                <MapPin size={18} color={colors.muted} />
              )
            }
          >
            {p.mod === 'video' ? 'Întâlnire video' : `La birou · ${p.cabinete?.adresa ?? ''}`}
          </Row>
        </View>
      ) : null}

      <View style={{ gap: 10 }}>
        <Button title="Vezi programările mele" onPress={() => router.dismissTo('/programari')} />
        <Button title="Înapoi acasă" variant="outline" onPress={() => router.dismissTo('/')} />
      </View>
    </ScrollView>
  );
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
      {icon}
      <Text variant="body" style={{ flex: 1 }}>
        {children}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 14,
  },
});
