import { useState, type ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { duration, EASE_OUT, PRESS_SCALE } from '@/lib/motion';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  scaleTo?: number;
};

/**
 * Feedback la apăsare: scale 0.97 în 120ms la press-in, revine la press-out.
 * CSS transition din Reanimated → rulează pe UI thread, fără worklet manual.
 * Cu „Reduce motion” activ, rămâne doar o ușoară schimbare de opacitate.
 */
export function PressableScale({ style, children, scaleTo = PRESS_SCALE, disabled, ...rest }: Props) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const active = pressed && !disabled;

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      pressRetentionOffset={{ top: 16, bottom: 16, left: 16, right: 16 }}
      onPressIn={(e) => {
        setPressed(true);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        rest.onPressOut?.(e);
      }}
    >
      <Animated.View
        style={[
          style,
          {
            transform: [{ scale: active && !reduced ? scaleTo : 1 }],
            opacity: active && reduced ? 0.85 : disabled ? 0.5 : 1,
            transitionProperty: ['transform', 'opacity'],
            transitionDuration: duration.press,
            transitionTimingFunction: EASE_OUT,
          },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
