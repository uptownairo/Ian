import * as Haptics from 'expo-haptics';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

import { duration, EASE_OUT } from '@/lib/motion';
import { colors, fonts, radius } from '@/lib/theme';

import { PressableScale } from './PressableScale';

/**
 * Chip de filtru. Selecția schimbă culoarea în 180ms (stare, nu mișcare),
 * cu un tick haptic de selecție.
 */
export function Chip({
  label,
  selected = false,
  onPress,
  tone = 'light',
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  tone?: 'light' | 'navy';
}) {
  const idle =
    tone === 'navy'
      ? { backgroundColor: colors.navySoft, borderColor: '#2A3A57', color: colors.onNavy }
      : { backgroundColor: colors.card, borderColor: colors.border, color: colors.text };
  const on = { backgroundColor: colors.accent, borderColor: colors.accent, color: '#FFFFFF' };
  const c = selected ? on : idle;

  return (
    <PressableScale
      onPress={() => {
        Haptics.selectionAsync();
        onPress?.();
      }}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={[
        s.chip,
        {
          backgroundColor: c.backgroundColor,
          borderColor: c.borderColor,
          transitionProperty: ['backgroundColor', 'borderColor'],
          transitionDuration: duration.toggle,
          transitionTimingFunction: EASE_OUT,
        },
      ]}
    >
      <Animated.Text
        style={[
          s.label,
          {
            color: c.color,
            transitionProperty: 'color',
            transitionDuration: duration.toggle,
            transitionTimingFunction: EASE_OUT,
          },
        ]}
      >
        {label}
      </Animated.Text>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  chip: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: radius.chip,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.semibold, fontSize: 14 },
});
