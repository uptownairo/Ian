import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarClock, LogIn } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { OptionCard } from '@/components/OptionCard';
import { PressableScale } from '@/components/PressableScale';
import { Skeleton } from '@/components/Skeleton';
import { SlotGrid } from '@/components/SlotGrid';
import { Text } from '@/components/Text';
import { useAuth } from '@/lib/auth';
import { creeazaProgramare, getCabinet, sloturiLibere } from '@/lib/data';
import { eroareText, formatDataLunga, formatOra, urmatoareleZile } from '@/lib/format';
import { useAsync } from '@/lib/hooks';
import { duration, EASE_OUT } from '@/lib/motion';
import { pretAfisat } from '@/lib/pret';
import { colors, fonts, radius } from '@/lib/theme';
import type { ModIntalnire } from '@/lib/types';

const ZILE = 14;

export default function ProgramareScreen() {
  const { cabinetId } = useLocalSearchParams<{ cabinetId: string }>();
  const { session, ready } = useAuth();
  const insets = useSafeAreaInsets();
  const { data: cabinet, loading, error } = useAsync(() => getCabinet(cabinetId), [cabinetId]);

  const zile = useMemo(() => urmatoareleZile(ZILE), []);
  // alegerile utilizatorului; implicitele se derivă din cabinet
  const [proAles, setProId] = useState<string | null>(null);
  const [servAles, setServId] = useState<string | null>(null);
  const [modAles, setMod] = useState<ModIntalnire>('birou');
  const [zi, setZi] = useState(zile[0].iso);
  const [nota, setNota] = useState('');
  const [trimite, setTrimite] = useState(false);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [reincarca, setReincarca] = useState(0);

  const proId =
    proAles ?? (cabinet?.profesionisti.length === 1 ? cabinet.profesionisti[0].id : null);
  const servId = servAles ?? cabinet?.servicii[0]?.id ?? null;
  const serviciu = cabinet?.servicii.find((x) => x.id === servId) ?? null;
  const pro = cabinet?.profesionisti.find((x) => x.id === proId) ?? null;
  // modul video doar dacă serviciul îl permite
  const mod: ModIntalnire = serviciu?.video_ok ? modAles : 'birou';

  // Orele vin DOAR din rpc('sloturi_libere'). Cheia identifică cererea curentă:
  // cât timp rezultatul ține de altă cheie, grila e „în încărcare”.
  const slotKey = proId && serviciu ? `${proId}|${serviciu.id}|${zi}|${reincarca}` : null;
  const [sloturi, setSloturi] = useState<{ key: string; slots: string[] } | null>(null);
  const [selectat, setSelectat] = useState<{ key: string; iso: string } | null>(null);
  const slots = sloturi && sloturi.key === slotKey ? sloturi.slots : [];
  const slotsLoading = !!slotKey && sloturi?.key !== slotKey;
  const slot = selectat && selectat.key === slotKey ? selectat.iso : null;

  useEffect(() => {
    if (!slotKey || !proId || !serviciu) return;
    let alive = true;
    sloturiLibere(proId, zi, serviciu.durata_min).then(
      (s) => alive && setSloturi({ key: slotKey, slots: s }),
      (e) => {
        if (!alive) return;
        setSloturi({ key: slotKey, slots: [] });
        setMesaj(eroareText(e));
      },
    );
    return () => {
      alive = false;
    };
  }, [slotKey, proId, serviciu, zi]);

  const confirma = async () => {
    if (!proId || !serviciu || !slot) return;
    setTrimite(true);
    setMesaj(null);
    try {
      const p = await creeazaProgramare({
        profesionistId: proId,
        serviciuId: serviciu.id,
        start: slot,
        mod,
        nota: nota.trim(),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace({ pathname: '/programare/confirmare', params: { id: p.id } });
    } catch (e) {
      // ora a fost luată între timp: arătăm eroarea și reîncărcăm sloturile
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMesaj(eroareText(e));
      setReincarca((n) => n + 1);
    } finally {
      setTrimite(false);
    }
  };

  if (!ready || loading) {
    return (
      <View style={{ padding: 20, gap: 12 }}>
        <Skeleton height={56} radius={radius.input} />
        <Skeleton height={56} radius={radius.input} />
        <Skeleton height={120} radius={radius.input} />
      </View>
    );
  }

  if (!session) {
    return (
      <EmptyState
        icon={<LogIn size={36} color={colors.accent} />}
        title="Intră în cont ca să programezi"
        text="Restul aplicației merge și fără cont. Pentru programare avem nevoie să știm cine vine."
        action={<Button title="Intră în cont" onPress={() => router.push('/auth/login')} />}
      />
    );
  }

  if (error || !cabinet) {
    return <EmptyState title="Cabinet indisponibil" text={error ? eroareText(error) : undefined} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, gap: 24, paddingBottom: 140 + insets.bottom }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="h2">{cabinet.nume}</Text>

        {cabinet.profesionisti.length > 1 && (
          <Step title="Cu cine">
            {cabinet.profesionisti.map((p) => (
              <OptionCard
                key={p.id}
                title={p.nume}
                subtitle={p.titlu}
                selected={p.id === proId}
                onPress={() => setProId(p.id)}
              />
            ))}
          </Step>
        )}

        <Step title="Serviciu">
          {cabinet.servicii.map((sv) => (
            <OptionCard
              key={sv.id}
              title={sv.nume}
              subtitle={`${sv.durata_min} min`}
              meta={pretAfisat(sv, cabinet.tip)}
              selected={sv.id === servId}
              onPress={() => setServId(sv.id)}
            />
          ))}
        </Step>

        {serviciu?.video_ok && (
          <Step title="Cum vă întâlniți">
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <OptionCard title="La birou" selected={mod === 'birou'} onPress={() => setMod('birou')} />
              </View>
              <View style={{ flex: 1 }}>
                <OptionCard title="Video" selected={mod === 'video'} onPress={() => setMod('video')} />
              </View>
            </View>
          </Step>
        )}

        <Step title="Ziua">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
            style={{ marginHorizontal: -20 }}
          >
            {zile.map((z) => {
              const on = z.iso === zi;
              return (
                <PressableScale
                  key={z.iso}
                  onPress={() => {
                    if (on) return;
                    Haptics.selectionAsync();
                    setZi(z.iso);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${z.zi} ${z.data}`}
                  style={[
                    s.day,
                    {
                      backgroundColor: on ? colors.navy : colors.card,
                      borderColor: on ? colors.navy : colors.border,
                      transitionProperty: ['backgroundColor', 'borderColor'],
                      transitionDuration: duration.toggle,
                      transitionTimingFunction: EASE_OUT,
                    },
                  ]}
                >
                  <Text style={[s.dayName, { color: on ? colors.onNavyMuted : colors.muted }]}>{z.zi}</Text>
                  <Text style={[s.dayDate, { color: on ? '#FFFFFF' : colors.text }]}>{z.data}</Text>
                </PressableScale>
              );
            })}
          </ScrollView>
        </Step>

        <Step title="Ora">
          {!proId ? (
            <Text variant="small">Alege mai întâi profesionistul.</Text>
          ) : (
            <SlotGrid
              key={slotKey ?? 'none'}
              slots={slots}
              loading={slotsLoading}
              selected={slot}
              onSelect={(iso) => {
                setMesaj(null);
                if (slotKey) setSelectat({ key: slotKey, iso });
              }}
            />
          )}
        </Step>

        <Step title="Mesaj (opțional)">
          <TextInput
            value={nota}
            onChangeText={setNota}
            placeholder="Pe scurt, despre ce e vorba"
            placeholderTextColor={colors.muted}
            multiline
            maxLength={500}
            style={s.note}
          />
        </Step>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
        {mesaj && (
          <Animated.View entering={FadeIn.duration(180)} style={s.error} accessibilityLiveRegion="polite">
            <Text style={s.errorText}>{mesaj}</Text>
          </Animated.View>
        )}
        {slot && pro && serviciu && (
          <View style={s.summary}>
            <CalendarClock size={16} color={colors.muted} />
            <Text variant="small" style={{ flex: 1 }} numberOfLines={1}>
              {formatDataLunga(slot)}, {formatOra(slot)} · {mod === 'video' ? 'video' : 'la birou'}
            </Text>
          </View>
        )}
        <Button
          title="Trimite cererea de programare"
          onPress={confirma}
          loading={trimite}
          disabled={!slot || !serviciu || !proId}
        />
      </View>
    </View>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text variant="label">{title}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  day: {
    width: 68,
    minHeight: 64,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayName: { fontFamily: fonts.semibold, fontSize: 12 },
  dayDate: { fontFamily: fonts.bold, fontSize: 15 },
  note: {
    minHeight: 96,
    backgroundColor: colors.card,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    textAlignVertical: 'top',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  error: { backgroundColor: colors.dangerBg, borderRadius: 12, padding: 12 },
  errorText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.danger },
});
