// Toate orele se afișează în Europe/Bucharest, indiferent de fusul telefonului.
export const TZ = 'Europe/Bucharest';

const ora = new Intl.DateTimeFormat('ro-RO', { timeZone: TZ, hour: '2-digit', minute: '2-digit' });
const ziScurta = new Intl.DateTimeFormat('ro-RO', { timeZone: TZ, weekday: 'short' });
const ziLuna = new Intl.DateTimeFormat('ro-RO', { timeZone: TZ, day: 'numeric', month: 'short' });
const dataLunga = new Intl.DateTimeFormat('ro-RO', {
  timeZone: TZ,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const isoZi = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatOra(iso: string | Date) {
  return ora.format(new Date(iso));
}

export function formatDataLunga(iso: string | Date) {
  const s = dataLunga.format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Data calendaristică (YYYY-MM-DD) în ora României. */
export function ziRomania(d: Date = new Date()) {
  return isoZi.format(d);
}

/** Următoarele `n` zile (inclusiv azi), ca YYYY-MM-DD în ora României. */
export function urmatoareleZile(n: number) {
  const out: { iso: string; zi: string; data: string; azi: boolean }[] = [];
  const now = Date.now();
  for (let i = 0; i < n; i++) {
    // 12:00 UTC cade mereu în aceeași zi calendaristică în România
    const d = new Date(now + i * 86_400_000);
    const iso = ziRomania(d);
    const mid = new Date(`${iso}T12:00:00Z`);
    out.push({
      iso,
      zi: i === 0 ? 'Azi' : i === 1 ? 'Mâine' : capitalize(ziScurta.format(mid).replace('.', '')),
      data: ziLuna.format(mid).replace('.', ''),
      azi: i === 0,
    });
  }
  return out;
}

/** „Azi, 16:00” / „Mâine, 09:30” / „joi, 10:00” */
export function formatSlotScurt(iso: string) {
  const zi = ziRomania(new Date(iso));
  if (zi === ziRomania()) return `Azi, ${formatOra(iso)}`;
  if (zi === ziRomania(new Date(Date.now() + 86_400_000))) return `Mâine, ${formatOra(iso)}`;
  return `${ziScurta.format(new Date(iso)).replace('.', '')}, ${formatOra(iso)}`;
}

export function initiale(nume: string) {
  return nume
    .replace(/^(Av\.|Notar|BNP|Cabinet)\s+/gi, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export function distantaKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistanta(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1).replace('.', ',')} km`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function eroareText(e: unknown) {
  if (e && typeof e === 'object' && 'message' in e && typeof e.message === 'string') return e.message;
  return 'A apărut o eroare. Încearcă din nou.';
}
