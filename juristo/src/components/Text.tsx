import { Text as RNText, type TextProps } from 'react-native';

import { colors, fonts } from '@/lib/theme';

type Variant = 'title' | 'h2' | 'h3' | 'body' | 'bodyBold' | 'small' | 'label';

const styles = {
  title: { fontFamily: fonts.serif, fontSize: 32, lineHeight: 38, color: colors.text },
  h2: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, color: colors.text },
  h3: { fontFamily: fonts.bold, fontSize: 17, lineHeight: 22, color: colors.text },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22, color: colors.text },
  bodyBold: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22, color: colors.text },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.muted },
  label: {
    fontFamily: fonts.extrabold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    color: colors.muted,
  },
};

export function Text({ variant = 'body', style, ...rest }: TextProps & { variant?: Variant }) {
  return <RNText {...rest} style={[styles[variant], style]} />;
}
