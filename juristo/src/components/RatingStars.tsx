import { Star } from 'lucide-react-native';
import { View } from 'react-native';

import { colors } from '@/lib/theme';

export function RatingStars({ value, size = 14 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <View
      style={{ flexDirection: 'row', gap: 2 }}
      accessible
      accessibilityLabel={`${value.toFixed(1)} din 5 stele`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          color={colors.star}
          fill={i <= rounded ? colors.star : 'transparent'}
          strokeWidth={2}
        />
      ))}
    </View>
  );
}
