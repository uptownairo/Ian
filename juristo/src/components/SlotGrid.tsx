import * as Haptics from 'expo-haptics';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { formatOra } from '@/lib/format';
import { duration, EASE_OUT } from '@/lib/motion';
import { colors, fonts } from '@/lib/theme';

import { PressableScale } from './PressableScale';
import { Skeleton } from './Skeleton';
import { Text } from './Text';

/** Grila de ore libere (vin doar din rpc('sloturi_libere')). */
export function SlotGrid({
  slots,
  loading,
  selected,
  onSelect,
}: {
  slots: string[];
  loading: boolean;
  selected: string | null;
  onSelect: (iso: string) => void;
}) {
  if (loading) {
    return (
      <View style={s.grid}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} width="23%" height={44} radius={14} />
        ))}
      </View>
    );
  }

  if (slots.length === 0) {
    return (
      <Text variant="small" style={{ paddingVertical: 12 }}>
        Nu sunt ore libere în această zi. Alege altă zi.
      </Text>
    );
  }

  return (
    // Fade scurt la schimbarea zilei: grila nouă nu apare brusc peste cea veche.
    <Animated.View entering={FadeIn.duration(180)} style={s.grid}>
      {slots.map((iso) => {
        const on = iso === selected;
        return (
          <PressableScale
            key={iso}
            onPress={() => {
              Haptics.selectionAsync();
              onSelect(iso);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Ora ${formatOra(iso)}`}
            style={[
              s.slot,
              {
                backgroundColor: on ? colors.accent : colors.card,
                borderColor: on ? colors.accent : colors.border,
                transitionProperty: ['backgroundColor', 'borderColor'],
                transitionDuration: duration.toggle,
                transitionTimingFunction: EASE_OUT,
              },
            ]}
          >
            <Text style={[s.label, { color: on ? '#FFFFFF' : colors.text }]}>{formatOra(iso)}</Text>
          </PressableScale>
        );
      })}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slot: {
    width: 76,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.bold, fontSize: 15 },
});
