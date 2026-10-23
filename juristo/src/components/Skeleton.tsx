import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Animated, { useReducedMotion, type CSSAnimationKeyframes } from 'react-native-reanimated';

import { colors } from '@/lib/theme';

const pulse: CSSAnimationKeyframes = {
  from: { opacity: 1 },
  to: { opacity: 0.45 },
};

/** Placeholder cât se încarcă. Puls de opacitate (CSS animation, buclă); static cu Reduce motion. */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.border },
        !reduced && {
          animationName: pulse,
          animationDuration: 900,
          animationIterationCount: 'infinite',
          animationDirection: 'alternate',
          animationTimingFunction: 'ease-in-out',
        },
        style,
      ]}
    />
  );
}
