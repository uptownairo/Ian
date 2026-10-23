import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from './Text';

export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24, gap: 10 }}>
      {icon}
      <Text variant="h2" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {text && (
        <Text variant="body" style={{ textAlign: 'center', color: '#4C5668' }}>
          {text}
        </Text>
      )}
      {action && <View style={{ marginTop: 8, alignSelf: 'stretch' }}>{action}</View>}
    </View>
  );
}
