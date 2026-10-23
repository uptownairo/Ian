import { Image } from 'expo-image';
import { View } from 'react-native';

import { initiale } from '@/lib/format';
import { colors, fonts } from '@/lib/theme';

import { Text } from './Text';

export function Avatar({
  nume,
  uri,
  size = 52,
  tone = 'light',
}: {
  nume: string;
  uri?: string | null;
  size?: number;
  tone?: 'light' | 'navy';
}) {
  const dims = { width: size, height: size, borderRadius: size * 0.32 };
  if (uri) {
    return <Image source={{ uri }} style={dims} contentFit="cover" accessibilityIgnoresInvertColors />;
  }
  return (
    <View
      style={[
        dims,
        {
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tone === 'navy' ? colors.navySoft : '#E7ECFB',
        },
      ]}
    >
      <Text
        style={{
          fontFamily: fonts.serif,
          fontSize: size * 0.4,
          lineHeight: size * 0.5,
          color: tone === 'navy' ? colors.onNavy : colors.accent,
        }}
      >
        {initiale(nume)}
      </Text>
    </View>
  );
}
