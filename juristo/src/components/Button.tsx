import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '@/lib/theme';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Variant = 'primary' | 'navy' | 'outline' | 'danger';

const bg: Record<Variant, string> = {
  primary: colors.accent,
  navy: colors.navy,
  outline: colors.card,
  danger: colors.card,
};
const fg: Record<Variant, string> = {
  primary: '#FFFFFF',
  navy: '#FFFFFF',
  outline: colors.text,
  danger: colors.danger,
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bordered = variant === 'outline' || variant === 'danger';
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={[
        s.base,
        { backgroundColor: bg[variant] },
        bordered && { borderWidth: 1, borderColor: variant === 'danger' ? '#F2C4BF' : colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg[variant]} />
      ) : (
        <View style={s.row}>
          {icon}
          <Text style={[s.label, { color: fg[variant] }]}>{title}</Text>
        </View>
      )}
    </PressableScale>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fonts.bold, fontSize: 15 },
});
