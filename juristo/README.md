# Juristo — aplicația mobilă (Expo)

Programări la avocați și notari din Cluj-Napoca. Regulile produsului sunt în `CLAUDE.md`, pașii pe faze în `START-AICI.md`.

## Pornire
1. Rulează `supabase/schema.sql` în Supabase (SQL Editor).
2. `cp .env.example .env` și completează `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` (și `EXPO_PUBLIC_GOOGLE_MAPS_KEY` pentru hartă).
3. `npm install`, apoi `npx expo start` și scanezi codul QR cu Expo Go.

Recenziile Google cer Edge Function `google-place` publicată (`npx supabase functions deploy google-place`) și `google_place_id` completat în `cabinete`.
Harta Google pe Android și Sign in with Apple cer un development build: `npx eas-cli@latest build --profile development`.

## Ce conține (fazele 1–3)
- `src/app/(tabs)`: Acasă, Caută (Avocați/Notari + specializări, sortare după distanță), Programări, Cont (editare, logout, ștergere cont)
- `src/app/cabinet/[id]`: profil cu rating Google, butoane Site/Instagram/Facebook/WhatsApp/Sună, recenzii Google, servicii, hartă
- `src/app/programare`: alegere profesionist, serviciu, mod, zi și oră (doar din `sloturi_libere`), confirmare
- `src/app/auth/login`: cod pe email, Google, Apple

## Verificări
`npx tsc --noEmit` · `npx expo lint` · `npx expo-doctor`
