import { View } from 'react-native';

import { colors, fonts } from '@/lib/theme';
import type { StatusProgramare } from '@/lib/types';

import { Text } from './Text';

const map: Record<StatusProgramare, { label: string; fg: string; bg: string }> = {
  in_asteptare: { label: 'În așteptare', fg: colors.warning, bg: colors.warningBg },
  confirmata: { label: 'Confirmată', fg: colors.success, bg: colors.successBg },
  refuzata: { label: 'Refuzată', fg: colors.danger, bg: colors.dangerBg },
  anulata: { label: 'Anulată', fg: colors.muted, bg: colors.bg },
  finalizata: { label: 'Finalizată', fg: colors.navy, bg: '#E7ECFB' },
};

export function StatusBadge({ status }: { status: StatusProgramare }) {
  const c = map[status];
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: c.fg, fontFamily: fonts.bold, fontSize: 12 }}>{c.label}</Text>
    </View>
  );
}
