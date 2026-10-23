# Juristo — aplicație de programări la avocați și notari

> Fișierul acesta e citit automat de Claude Code. Descrie produsul, stack-ul și regulile proiectului.
> „Juristo” e nume de lucru. Se schimbă în `app.json` (name, slug) și în texte.

## Produsul
Marketplace mobil (Android + iOS) în care clienții găsesc **avocați** și **notari**, le văd profilul
(recenzii Google, hartă, site și rețele sociale) și fac o **programare** (la birou sau video).
Cabinetele își gestionează profilul, programul și cererile dintr-un **panou web** separat (faza 4).

Oraș de lansare: Cluj-Napoca. Limba interfeței: **română**.

## Stack (fix, nu schimba fără să întrebi)
- **Mobil:** Expo (SDK cel mai recent) + React Native + TypeScript + **Expo Router** (rutare pe fișiere)
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions), regiunea UE (Frankfurt)
- **Hartă:** `react-native-maps`
- **Recenzii Google:** Google Places API (New), apelat **doar** din Edge Function `google-place` (cheia nu ajunge în aplicație)
- **Fonturi:** `@expo-google-fonts/dm-serif-display` (titluri) + `@expo-google-fonts/manrope` (text)
- **Iconițe:** `lucide-react-native`
- **Build/publicare:** EAS Build + EAS Submit

## Structura proiectului
```
app/
  _layout.tsx                 # fonturi, provider sesiune, Stack
  (tabs)/_layout.tsx          # tab bar: Acasă, Caută, Programări, Cont
  (tabs)/index.tsx            # Acasă
  (tabs)/cauta.tsx            # Listă cu segment Avocați/Notari + filtre specializări
  (tabs)/programari.tsx       # programările clientului
  (tabs)/cont.tsx             # profil, logout, ștergere cont
  cabinet/[id].tsx            # profilul cabinetului
  programare/[cabinetId].tsx  # alegere serviciu, mod, zi, oră
  programare/confirmare.tsx
  auth/login.tsx
components/                   # CabinetCard, Chip, Segmented, RatingStars, GoogleReviews, MapCard, SocialButtons, SlotGrid ...
lib/
  supabase.ts                 # client Supabase (AsyncStorage pentru sesiune)
  theme.ts                    # culori, spațieri, fonturi (vezi mai jos)
  links.ts                    # construiește URL-uri: Maps, indicații, WhatsApp, Instagram, Facebook, tel
  types.ts                    # tipurile tabelelor
supabase/
  schema.sql                  # schema completă + date demo (rulată deja în Supabase)
  functions/google-place/index.ts
```

## Design (vine din prototipul aprobat)
```ts
// lib/theme.ts
export const colors = {
  navy: '#0E1A2E',      // header-e, butoane secundare pline
  navySoft: '#16243C',  // carduri pe fundal navy
  accent: '#3B5BDB',    // butoane principale, link-uri, tab activ
  bg: '#F4F5F8',        // fundal ecrane
  card: '#FFFFFF',
  text: '#121A27',
  muted: '#4C5668',
  border: '#E3E6ED',
  success: '#1F7A4D', successBg: '#E3F4EA',   // „Azi, 16:00” disponibilitate
  star: '#E8A317',
};
export const radius = { card: 20, button: 18, chip: 999, input: 16 };
```
- Titluri: DM Serif Display. Text: Manrope (400/600/700/800).
- Acasă: header navy cu colțuri rotunjite jos, logo + oraș, titlu mare, câmp de căutare alb; dedesubt două carduri mari „Avocați” (plin accent) și „Notari” (alb); chip-uri rapide („Divorț”, „Vânzare apartament”, „Succesiune”, „Procură”, „Contract de muncă”, „Firmă nouă”) care deschid lista deja filtrată; lista „Disponibili azi, lângă tine”.
- Profil: header navy cu inițiale/poză, nume, specializare, badge verificat, 3 statistici (rating Google, ani experiență, limbi); rând de 5 butoane (Site, Instagram, Facebook, WhatsApp, Sună); bloc **Recenzii Google**; Despre; Servicii; **Locație** cu hartă + „Deschide în Maps” + „Indicații rutiere”; buton fix „Programează o consultație”.
- Fără emoji. Ținte de atingere ≥ 44px. Contrast text ≥ 4.5:1.

## Reguli de business (obligatorii)
1. **Recenzii Google**: se cer live prin Edge Function după `google_place_id`. **Nu salva textul recenziilor în baza de date** (termenii Google). Afișează mereu sigla/textul „Google” lângă recenzii și butonul „Vezi toate recenziile pe Google” (`googleMapsUri`). API-ul dă maximum 5 recenzii, deci nu promite „toate”.
2. **Notari**: onorariile sunt reglementate, deci afișează „onorariu conform grilei notariale”, nu prețuri sau reduceri.
3. **Avocați**: fără clasamente de tip „cel mai bun avocat” și fără „promovat/sponsorizat” (regulile UNBR). Sortarea implicită e după distanță.
4. Un cabinet apare public **doar** dacă `verificat = true` (setat manual de admin după verificarea în Tablou/UNNPR).
5. Programarea se creează cu status `in_asteptare`. Cabinetul o confirmă sau o refuză. Suprapunerile sunt blocate în baza de date.
6. Sloturile libere vin **doar** din funcția SQL `sloturi_libere(profesionist, data, durata)`, nu se calculează în aplicație.
7. Ora se afișează mereu în fusul `Europe/Bucharest`.
8. Dacă există login cu Google pe iOS, trebuie să existe și **Sign in with Apple** (cerință Apple).
9. **Ștergerea contului** se face din aplicație (Cont → Șterge contul). Cerință a ambelor magazine.

## Link-uri externe (lib/links.ts)
- Maps: `https://www.google.com/maps/search/?api=1&query=<nume, adresă>&query_place_id=<place_id>`
- Indicații: `https://www.google.com/maps/dir/?api=1&destination=<adresă>&destination_place_id=<place_id>`
- WhatsApp: `https://wa.me/<telefon fără + și spații>` (în DB e salvat ca `+40712345678`)
- Instagram: `https://instagram.com/<handle>` · Facebook: URL complet salvat în DB
- Telefon: `tel:<telefon>`
- Deschidere cu `Linking.openURL`. Ascunde butonul dacă valoarea lipsește.

## Variabile de mediu
`.env` (aplicația): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_GOOGLE_MAPS_KEY` (doar Maps SDK, restricționată pe pachetul aplicației).
Secret Supabase (server): `GOOGLE_PLACES_KEY`, setat cu `supabase secrets set GOOGLE_PLACES_KEY=...`.

## Cum lucrezi
- TypeScript strict, componente mici, fără biblioteci de UI grele.
- După fiecare fază: aplicația pornește cu `npx expo start` fără erori și flow-ul fazei merge cap-coadă cu datele demo.
- Nu inventa date: folosește datele demo din `supabase/schema.sql`.
