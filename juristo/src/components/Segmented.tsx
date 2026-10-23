import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { duration, EASE_IN_OUT } from '@/lib/motion';
import { colors, fonts, radius } from '@/lib/theme';

/**
 * Control segmentat (Avocați / Notari).
 * Pastila e absolută și fără copii → îi animăm translateX pe UI thread, 180ms ease-in-out.
 * Textul își schimbă doar culoarea. Reduce motion: pastila sare direct, fără alunecare.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const [width, setWidth] = useState(0);
  const reduced = useReducedMotion();
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const segW = width > 0 ? (width - 8) / options.length : 0;

  return (
    <View
      style={s.track}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessibilityRole="tablist"
    >
      {segW > 0 && (
        <Animated.View
          pointerEvents="none"
          style={[
            s.pill,
            {
              width: segW,
              transform: [{ translateX: index * segW }],
              transitionProperty: 'transform',
              transitionDuration: reduced ? 0 : duration.toggle,
              transitionTimingFunction: EASE_IN_OUT,
            },
          ]}
        />
      )}
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={s.seg}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync();
              onChange(o.value);
            }}
          >
            <Animated.Text
              style={[
                s.label,
                {
                  color: selected ? '#FFFFFF' : colors.muted,
                  transitionProperty: 'color',
                  transitionDuration: duration.toggle,
                },
              ]}
            >
              {o.label}
            </Animated.Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
  },
  pill: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 4,
    borderRadius: radius.button - 4,
    backgroundColor: colors.navy,
  },
  seg: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bold, fontSize: 15 },
});
