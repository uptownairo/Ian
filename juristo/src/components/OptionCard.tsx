import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { duration, EASE_OUT } from '@/lib/motion';
import { colors, radius } from '@/lib/theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** Rând selectabil (profesionist, serviciu, mod). Selecția = culoare de bordură + bifă. */
export function OptionCard({
  title,
  subtitle,
  meta,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      onPress={() => {
        if (!selected) Haptics.selectionAsync();
        onPress();
      }}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      style={[
        s.card,
        {
          borderColor: selected ? colors.accent : colors.border,
          backgroundColor: selected ? '#F1F4FE' : colors.card,
          transitionProperty: ['borderColor', 'backgroundColor'],
          transitionDuration: duration.toggle,
          transitionTimingFunction: EASE_OUT,
        },
      ]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyBold">{title}</Text>
        {subtitle ? <Text variant="small">{subtitle}</Text> : null}
        {meta ? <Text variant="small" style={{ color: colors.text }}>{meta}</Text> : null}
      </View>
      <Animated.View
        style={[
          s.check,
          {
            backgroundColor: selected ? colors.accent : 'transparent',
            borderColor: selected ? colors.accent : colors.border,
            transitionProperty: ['backgroundColor', 'borderColor'],
            transitionDuration: duration.toggle,
          },
        ]}
      >
        {selected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
      </Animated.View>
    </PressableScale>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    minHeight: 56,
    borderRadius: radius.input,
    borderWidth: 1.5,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
