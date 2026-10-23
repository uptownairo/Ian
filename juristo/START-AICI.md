# Cum folosești kitul

## A. Pregătire (o singură dată, ~30 min)

1. Instalează **VS Code**, **Node.js LTS** și **Claude Code**. Pe telefon instalează **Expo Go**.
2. Fă un folder `juristo` și copiază în el tot conținutul kitului (`CLAUDE.md`, `supabase/`, `.env.example`).
3. **Supabase:**
   - supabase.com → New project → regiunea **Frankfurt (eu-central-1)**.
   - SQL Editor → lipește tot `supabase/schema.sql` → **Run**.
   - Project Settings → API → copiază **Project URL** și **anon key**.
4. Copiază `.env.example` ca `.env` și pune acolo cele două valori. Cheia Google Maps o adaugi la faza 2.
5. Deschide folderul în VS Code, pornește terminalul și scrie `claude`.

Apoi dai promptii de mai jos **pe rând**. Treci la următorul abia după ce faza curentă merge pe telefon.

---

## B. Promptii pentru Claude Code

### Faza 1: proiectul și ecranele
```
Citește CLAUDE.md. Creează în acest folder aplicația Expo (TypeScript, Expo Router) fără să ștergi fișierele existente.
Instalează: @supabase/supabase-js, @react-native-async-storage/async-storage, react-native-url-polyfill,
@expo-google-fonts/dm-serif-display, @expo-google-fonts/manrope, lucide-react-native, react-native-svg.
Fă lib/supabase.ts (citește .env), lib/theme.ts, lib/types.ts după supabase/schema.sql.
Construiește tab-urile Acasă, Caută, Programări, Cont și ecranul cabinet/[id] exact ca în secțiunea Design,
cu date reale din tabelele cabinete, profesionisti, servicii (datele demo sunt deja în Supabase).
În Caută: segment Avocați/Notari și chip-uri de specializare care filtrează după profesionisti.specializari.
Chip-urile rapide de pe Acasă deschid Caută deja filtrat. Programări și Cont rămân deocamdată goale.
La final rulează `npx expo start` și confirmă că nu sunt erori.
```

### Faza 2: recenzii Google, hartă și butoane
```
Faza 2 din CLAUDE.md. Pe ecranul cabinet/[id]:
1) Componenta GoogleReviews: apelează supabase.functions.invoke('google-place', { body: { placeId } }).
   Afișează nota mare, stelele, numărul total, până la 5 recenzii (autor, poză, stele, „acum X”, text)
   și butonul „Vezi toate recenziile pe Google” (mapsUrl). Pune eticheta „Recenzii Google”.
   Dacă cabinetul nu are google_place_id, ascunde blocul. Arată skeleton cât se încarcă.
2) MapCard cu react-native-maps: pin pe lat/lng, nu poate fi mutat, iar la apăsare se deschide Google Maps.
   Sub hartă: adresa + butoanele „Deschide în Maps” și „Indicații rutiere” (vezi Link-uri externe).
3) SocialButtons: Site, Instagram, Facebook, WhatsApp, Sună. Cele fără valoare se ascund.
Pune cheia de Maps în app.json (android.config.googleMaps.apiKey) din EXPO_PUBLIC_GOOGLE_MAPS_KEY prin app.config.ts.
În listă, fiecare card arată ratingul Google lângă nume (cerere separată, în cache, ca să nu încetinească lista).
```
Înainte de faza 2, tu faci:
- Google Cloud: activezi **Places API (New)** și **Maps SDK for Android/iOS**, faci două chei (una pentru Places, una pentru Maps) și pui **limită de buget**.
- În terminal: `npx supabase login`, `npx supabase link`, `npx supabase secrets set GOOGLE_PLACES_KEY=...`, `npx supabase functions deploy google-place`.
- În tabelul `cabinete` completezi `google_place_id` pentru cabinetele reale.

### Faza 3: cont și programare
```
Faza 3 din CLAUDE.md.
1) auth/login.tsx: login cu email (magic link / OTP pe email), Google și Apple (expo-apple-authentication pe iOS).
   Programarea cere login; restul aplicației merge și fără cont.
2) programare/[cabinetId].tsx: alege profesionistul (dacă sunt mai mulți), serviciul, modul (birou/video, doar dacă
   serviciu.video_ok), ziua (următoarele 14 zile) și ora. Orele vin DOAR din rpc('sloturi_libere').
   Confirmarea apelează rpc('creeaza_programare'). Dacă ora a fost luată între timp, arată mesajul erorii și reîncarcă sloturile.
3) programare/confirmare.tsx: rezumatul programării.
4) Tab Programări: viitoare și trecute, cu status colorat. Anularea folosește rpc('schimba_status_programare', 'anulata').
5) Tab Cont: nume, telefon, logout, „Șterge contul” (confirmare dublă, apoi rpc('sterge_contul_meu') și logout).
```

### Faza 4: panoul web pentru cabinete
```
Creează în folderul /panou o aplicație Next.js (App Router, TypeScript, Tailwind) pe aceeași bază Supabase, cu aceleași culori.
Login cu email. Un utilizator cu rol 'cabinet' își vede doar cabinetul lui (owner_id).
Pagini: Cereri noi (confirmă/refuză prin schimba_status_programare), Calendar săptămânal, Profil cabinet
(toate câmpurile, inclusiv google_place_id și link-urile sociale), Profesioniști, Servicii, Program și zile libere.
Pentru rolul 'admin': pagina „De verificat”, cu lista cabinetelor neverificate și butonul Verifică.
```

### Faza 5: notificări și publicare
```
Faza 5: notificări push cu expo-notifications (salvează tokenul în profiles.push_token).
Fă o Edge Function care trimite push la: programare nouă (către cabinet), confirmată/refuzată (către client),
reminder cu 24h și 2h înainte (programată cu pg_cron).
Apoi pregătește publicarea: eas.json, iconiță, splash, bundleIdentifier/package, permisiuni, și o listă cu tot ce
trebuie completat în App Store Connect și Google Play Console (App Privacy / Data safety).
```

---

## C. Testare pe telefon
`npx expo start` → scanezi codul QR cu Expo Go.
Harta Google pe Android și login-ul cu Apple pot cere un **development build**: `npx eas build --profile development`.
Claude Code îți spune când e nevoie.
