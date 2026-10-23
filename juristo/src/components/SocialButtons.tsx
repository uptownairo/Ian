import { Globe, MessageCircle, Phone } from 'lucide-react-native';
import type { ComponentType } from 'react';
import { StyleSheet, View } from 'react-native';

import { instagramUrl, open, siteUrl, telUrl, whatsappUrl } from '@/lib/links';
import { colors, fonts } from '@/lib/theme';
import type { Cabinet } from '@/lib/types';

import { FacebookIcon, InstagramIcon } from './BrandIcons';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** Site, Instagram, Facebook, WhatsApp, Sună. Butoanele fără valoare se ascund. */
export function SocialButtons({ cabinet }: { cabinet: Cabinet }) {
  const items: { label: string; Icon: ComponentType<{ size?: number; color?: string }>; url: string }[] = [];
  if (cabinet.site) items.push({ label: 'Site', Icon: Globe, url: siteUrl(cabinet.site) });
  if (cabinet.instagram) items.push({ label: 'Instagram', Icon: InstagramIcon, url: instagramUrl(cabinet.instagram) });
  if (cabinet.facebook) items.push({ label: 'Facebook', Icon: FacebookIcon, url: cabinet.facebook });
  if (cabinet.whatsapp) items.push({ label: 'WhatsApp', Icon: MessageCircle, url: whatsappUrl(cabinet.whatsapp) });
  if (cabinet.telefon) items.push({ label: 'Sună', Icon: Phone, url: telUrl(cabinet.telefon) });

  if (items.length === 0) return null;

  return (
    <View style={s.row}>
      {items.map(({ label, Icon, url }) => (
        <PressableScale
          key={label}
          style={s.btn}
          onPress={() => open(url)}
          accessibilityRole="link"
          accessibilityLabel={label}
        >
          <View style={s.icon}>
            <Icon size={20} color={colors.navy} />
          </View>
          <Text style={s.label} numberOfLines={1}>
            {label}
          </Text>
        </PressableScale>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, alignItems: 'center', gap: 6, minHeight: 64 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontFamily: fonts.semibold, fontSize: 12, color: colors.muted },
});
