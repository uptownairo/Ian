import { Linking } from 'react-native';

import type { Cabinet } from './types';

const enc = encodeURIComponent;

export function mapsUrl(c: Pick<Cabinet, 'nume' | 'adresa' | 'oras' | 'google_place_id'>) {
  const query = `${c.nume}, ${c.adresa}, ${c.oras}`;
  let url = `https://www.google.com/maps/search/?api=1&query=${enc(query)}`;
  if (c.google_place_id) url += `&query_place_id=${enc(c.google_place_id)}`;
  return url;
}

export function directionsUrl(c: Pick<Cabinet, 'adresa' | 'oras' | 'google_place_id'>) {
  let url = `https://www.google.com/maps/dir/?api=1&destination=${enc(`${c.adresa}, ${c.oras}`)}`;
  if (c.google_place_id) url += `&destination_place_id=${enc(c.google_place_id)}`;
  return url;
}

// În DB: +40712345678 → wa.me/40712345678
export function whatsappUrl(phone: string) {
  return `https://wa.me/${phone.replace(/[^\d]/g, '')}`;
}

export function instagramUrl(handle: string) {
  return `https://instagram.com/${handle.replace(/^@/, '')}`;
}

export function telUrl(phone: string) {
  return `tel:${phone.replace(/\s/g, '')}`;
}

export function siteUrl(site: string) {
  return /^https?:\/\//i.test(site) ? site : `https://${site}`;
}

export async function open(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    // aplicația țintă lipsește: nu blocăm UI-ul
  }
}
