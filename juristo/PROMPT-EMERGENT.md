Construiește aplicația mobilă **Juristo**: un marketplace (Android + iOS) în care clienții din Cluj-Napoca găsesc **avocați** și **notari**, le văd profilul (recenzii Google, hartă, site, rețele sociale) și fac o **programare** (la birou sau video). Toată interfața e în **limba română**.

Lucrează pe etape (mai jos) și oprește-te după fiecare etapă ca să pot testa în preview. Nu trece la etapa următoare până nu-ți confirm.

---

## 1. Stack — OBLIGATORIU, nu-l schimba

- **Mobil:** Expo (cel mai recent SDK) + React Native + TypeScript strict + **Expo Router** (rutare pe fișiere).
- **Backend:** **Supabase**, NU MongoDB/FastAPI și NU alt backend propriu. Folosește Postgres, Auth și Edge Functions din Supabase. Schema SQL completă e la finalul acestui mesaj și **o rulez eu** în Supabase. Tu doar te conectezi la ea.
- Client: `@supabase/supabase-js` + `@react-native-async-storage/async-storage` (sesiunea) + `react-native-url-polyfill`. Auth cu `flowType: 'pkce'`.
- **Hartă:** `react-native-maps`.
- **Fonturi:** `@expo-google-fonts/dm-serif-display` (titluri) + `@expo-google-fonts/manrope` (text, greutățile 400/600/700/800).
- **Iconițe:** `lucide-react-native` + `react-native-svg`. Lucide nu are sigle Instagram/Facebook, deci desenează-le ca SVG în același stil (contur, 2px).
- **Animații:** `react-native-reanimated` (v4) + `react-native-worklets`, `expo-haptics`. NU folosi `Animated` din core.
- Locație: `expo-location`. Login: `expo-auth-session`, `expo-web-browser`, `expo-crypto`, `expo-apple-authentication`.
- Instalează pachetele cu `npx expo install`, ca versiunile să se potrivească cu SDK-ul.
- Fără biblioteci UI grele (fără NativeBase, Tamagui, Paper etc.). Componente mici, proprii.

**Variabile de mediu** (le completez eu):
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_GOOGLE_MAPS_KEY=      # doar Maps SDK
```
Pe server (secret Supabase, nu în aplicație): `GOOGLE_PLACES_KEY`.
Cheia Maps intră prin `app.config.ts`: `android.config.googleMaps.apiKey` și `ios.config.googleMapsApiKey`.

## 2. Structura proiectului

```
src/app/
  _layout.tsx                 # fonturi, AuthProvider (sesiune Supabase), Stack
  (tabs)/_layout.tsx          # tab bar nativ: Acasă, Caută, Programări, Cont
  (tabs)/index.tsx            # Acasă
  (tabs)/cauta.tsx            # listă + segment Avocați/Notari + filtre specializări
  (tabs)/programari.tsx       # programările clientului
  (tabs)/cont.tsx             # profil, logout, ștergere cont
  cabinet/[id].tsx            # profilul cabinetului
  programare/[cabinetId].tsx  # alegere profesionist, serviciu, mod, zi, oră
  programare/confirmare.tsx
  auth/login.tsx              # modal
src/components/  PressableScale, Text, Button, Chip, Segmented, Avatar, CabinetCard,
                 RatingStars, Skeleton, GoogleReviews, MapCard, SocialButtons,
                 SlotGrid, OptionCard, StatusBadge, EmptyState
src/lib/  supabase.ts, theme.ts, motion.ts, types.ts, links.ts, format.ts,
          data.ts (toate apelurile Supabase), hooks.ts, auth.tsx, specializari.ts, pret.ts
supabase/schema.sql, supabase/functions/google-place/index.ts
```

## 3. Design

```ts
// src/lib/theme.ts
export const colors = {
  navy: '#0E1A2E',      // header-e, butoane secundare pline
  navySoft: '#16243C',  // carduri pe fundal navy
  accent: '#3B5BDB',    // butoane principale, link-uri, tab activ
  bg: '#F4F5F8',        // fundal ecrane
  card: '#FFFFFF',
  text: '#121A27',
  muted: '#4C5668',
  border: '#E3E6ED',
  success: '#1F7A4D', successBg: '#E3F4EA',   // badge „Azi, 16:00”
  star: '#E8A317',
  onNavy: '#FFFFFF', onNavyMuted: '#B9C3D6',
  danger: '#B42318', dangerBg: '#FDECEA',
  warning: '#8A5A00', warningBg: '#FFF3D6',
};
export const radius = { card: 20, button: 18, chip: 999, input: 16 };
```
- Titluri: DM Serif Display. Text: Manrope.
- **Fără emoji.** Ținte de atingere ≥ 44px (folosește `hitSlop` dacă vizualul e mai mic). Contrast text ≥ 4.5:1.
- Doar mod luminos (`userInterfaceStyle: 'light'`). Status bar luminos pe header-ele navy.

## 4. Ecrane

### Acasă `(tabs)/index.tsx`
- Header **navy** cu colțurile de jos rotunjite (28): stânga logo (pătrat accent cu iconița `Scale`) + „Juristo”, dreapta pastila „Cluj-Napoca” cu iconiță pin.
- Titlu mare (DM Serif, alb): „Avocați și notari, programați în câteva minute”.
- Câmp de căutare alb. La submit deschide Caută cu `?q=...`.
- Două carduri mari una lângă alta: **„Avocați”** (fundal accent, text alb, subtitlu „Consultanță și instanță”) și **„Notari”** (alb, bordură, subtitlu „Acte, procuri, succesiuni”). Fiecare deschide Caută filtrat pe tip.
- Secțiunea „Ai nevoie de” cu chip-uri rapide care deschid Caută **deja filtrat** (tip + specializare din `profesionisti.specializari`):
  - Divorț → avocat, Familie
  - Vânzare apartament → notar, Imobiliare
  - Succesiune → notar, Succesiuni
  - Procură → notar, Procuri
  - Contract de muncă → avocat, Muncă
  - Firmă nouă → avocat, Comercial
- Lista **„Disponibili azi, lângă tine”**: pentru fiecare cabinet ia primul slot liber de azi din `rpc('sloturi_libere')` (primul profesionist, durată 30). Arată doar cabinetele care au slot azi, sortate după distanță, maximum 5. Pe card apare badge-ul verde „Azi, 16:00”. Dacă nu e niciunul: „Nu mai sunt ore libere azi. Vezi lista completă în Caută pentru zilele următoare.”
- Pull-to-refresh.

### Caută `(tabs)/cauta.tsx`
- Titlu „Caută”, câmp de căutare (caută fără diacritice în nume, descriere, zonă, adresă, numele/titlul/specializările profesioniștilor), buton X de golire.
- **Segment Avocați / Notari** (control segmentat propriu, vezi Animații). Schimbarea tipului resetează specializarea.
- Rând orizontal de chip-uri: „Toate” + specializările distincte din datele încărcate pentru tipul curent, sortate alfabetic (locale `ro`).
- Parametrii `tip`, `spec`, `q` din URL setează filtrele, inclusiv când tab-ul e deschis din nou cu alți parametri. Fă asta fără `useEffect` + `setState`: compară o cheie a parametrilor în timpul render-ului.
- Text deasupra listei: „N rezultate · sortate după distanță”.
- **Sortare după distanță** față de locația utilizatorului (`expo-location`, permisiune cerută o dată). Dacă e refuzată: centrul Clujului `{ lat: 46.7712, lng: 23.6236 }`. Distanța se calculează cu haversine și se afișează „850 m” / „2,4 km”.
- Listă `Animated.FlatList` de `CabinetCard`, stare goală „Niciun rezultat”, skeleton-uri la încărcare, pull-to-refresh.

### CabinetCard
Avatar (poză sau inițialele profesionistului, fără prefixe „Av.”, „Notar”, „BNP”, „Cabinet”), nume profesionist + bifă „verificat” + **rating Google** în dreapta. Ratingul e o cerere separată prin Edge Function, ținută **în cache în memorie** ca să nu încetinească lista; cât se încarcă arată skeleton. Dedesubt: titlul profesionistului, zona · distanța, badge-ul verde de slot (dacă există), maximum 3 tag-uri de specializare. Apăsarea deschide `cabinet/[id]`.

### Profil cabinet `cabinet/[id].tsx`
- Header nativ transparent, cu săgeata albă.
- Header **navy** cu colțurile de jos rotunjite: avatar mare (84), numele profesionistului, titlul, numele cabinetului (dacă diferă), badge „Verificat în Tabloul avocaților” / „Verificat în evidența UNNPR”.
- **3 statistici** în carduri navySoft: Rating Google (skeleton cât se încarcă, „–” dacă nu are), Ani experiență, Limbi („RO · EN”).
- **Rând de 5 butoane:** Site, Instagram, Facebook, WhatsApp, Sună. Cele fără valoare se **ascund**.
- **Recenzii Google** (componenta GoogleReviews, vezi mai jos).
- **Despre:** descrierea + tag-urile de specializare.
- **Servicii:** nume, durată, „și video” dacă `video_ok`, prețul afișat după regula de preț (vezi Reguli).
- **Locație:** MapCard.
- **Buton fix jos:** „Programează o consultație” → `programare/[cabinetId]`.
- Stări de încărcare (skeleton) și eroare („Cabinet indisponibil” + buton Înapoi).

### GoogleReviews
- Apelează `supabase.functions.invoke('google-place', { body: { placeId } })`.
- Eticheta „Recenzii Google” + wordmark-ul „Google” colorat.
- Nota mare (ex. „4,8”), stelele, „N recenzii pe Google”.
- Până la **5** recenzii: poza autorului (sau inițiale), nume, stele, „acum X” (`relativePublishTimeDescription`), text (maximum 6 rânduri).
- Butonul „Vezi toate recenziile pe Google” (deschide `mapsUrl`).
- Dacă cabinetul nu are `google_place_id` sau cererea eșuează: **ascunde blocul**. Cât se încarcă: skeleton.

### MapCard
Hartă `react-native-maps` înaltă de 180, cu pin fix pe `lat/lng`. Harta **nu se poate mișca** (scroll, zoom, rotate și pitch dezactivate), iar apăsarea pe ea deschide Google Maps. Pe Android folosește `PROVIDER_GOOGLE`. Pentru web fă un fișier `MapPreview.web.tsx` cu un placeholder (react-native-maps nu merge pe web). Sub hartă: adresa + butoanele „Deschide în Maps” (contur) și „Indicații rutiere” (navy).

### Programare `programare/[cabinetId].tsx` (cere login)
- Fără sesiune: ecran „Intră în cont ca să programezi” cu buton spre `auth/login`. Restul aplicației merge fără cont.
- Pașii:
  1. **Cu cine:** doar dacă cabinetul are mai mulți profesioniști.
  2. **Serviciu.**
  3. **Cum vă întâlniți:** La birou / Video, doar dacă `serviciu.video_ok`.
  4. **Ziua:** rând orizontal cu următoarele 14 zile („Azi”, „Mâine”, apoi „Lun”, „Mar”... + „24 oct”).
  5. **Ora:** grilă de sloturi.
  6. **Mesaj (opțional):** maximum 500 de caractere.
- Implicitele (primul serviciu, unicul profesionist, modul „birou” dacă serviciul nu permite video) se **derivă** din date, nu se setează în `useEffect`.
- **Orele vin DOAR din `rpc('sloturi_libere', { p_profesionist, p_data, p_durata_min })`.** Nu calcula sloturi în aplicație. Selecția orei se resetează când se schimbă profesionistul, serviciul sau ziua.
- Footer fix: rezumatul („Vineri, 24 octombrie, 10:00 · la birou”) și butonul „Trimite cererea de programare”.
- Confirmarea apelează `rpc('creeaza_programare', { p_profesionist, p_serviciu, p_start, p_mod, p_nota })`.
  - Succes: haptic Success, apoi `router.replace` spre confirmare cu `id`.
  - Eroare (ex. „Ora aleasă nu mai este disponibilă”): haptic Error, arată mesajul erorii într-o casetă roșie și **reîncarcă sloturile**.

### Confirmare `programare/confirmare.tsx`
Fără buton înapoi și fără gest de swipe-back. Cerc verde cu bifă (animat, vezi Animații), titlul „Cerere trimisă”, textul „Cabinetul confirmă sau refuză programarea. Statusul îl vezi oricând în tab-ul Programări.” Card „Rezumat” cu status, data și intervalul orar, cabinetul, profesionistul, serviciul · durata, modul și adresa. Butoane „Vezi programările mele” și „Înapoi acasă”.

### Programări `(tabs)/programari.tsx`
- Fără cont: îndemn spre login.
- Segment Viitoare / Trecute (după `end_at` față de momentul încărcării; nu folosi `Date.now()` în render). Reîncărcare la revenirea pe tab.
- Card: data lungă, intervalul orar mare (DM Serif), **status colorat**, cabinet, profesionist · serviciu, mod/adresă.
- Statusuri: În așteptare (galben), Confirmată (verde), Refuzată (roșu), Anulată (gri), Finalizată (navy).
- Buton „Anulează” doar pentru cele viitoare în așteptare sau confirmate. Confirmă cu Alert, apoi `rpc('schimba_status_programare', { p_id, p_status: 'anulata' })`.

### Cont `(tabs)/cont.tsx`
Fără cont: îndemn spre login. Cu cont: avatar, nume, email; câmpurile **Nume** și **Telefon** editabile + buton „Salvează” (activ doar dacă s-a modificat ceva); „Ieși din cont”; **„Șterge contul”** cu **confirmare dublă** (două Alert-uri), apoi `rpc('sterge_contul_meu')`, logout și întoarcere acasă.

### Login `auth/login.tsx` (modal)
- **Email cu cod OTP:** `signInWithOtp({ email })`, apoi ecranul de cod cu 6 cifre și `verifyOtp({ email, token, type: 'email' })`.
- **Google:** `signInWithOAuth({ provider: 'google', options: { redirectTo: makeRedirectUri(), skipBrowserRedirect: true } })`, apoi `WebBrowser.openAuthSessionAsync`, apoi `exchangeCodeForSession(code)`.
- **Sign in with Apple** (doar iOS, dacă e disponibil): nonce SHA-256 cu `expo-crypto`, apoi `signInWithIdToken({ provider: 'apple', token, nonce })`. Salvează numele în `profiles` la prima autentificare.
- După login, ecranul se închide singur.

## 5. Reguli de business (obligatorii)

1. **Recenzii Google** se cer live prin Edge Function după `google_place_id`. **Nu salva textul recenziilor în baza de date** (termenii Google). Ai voie doar la cache în memorie. Afișează mereu „Google” lângă recenzii și butonul „Vezi toate recenziile pe Google”. API-ul dă maximum 5 recenzii, deci nu promite „toate” în altă parte.
2. **Notari:** onorariile sunt reglementate. Dacă `pret_text` conține cifre, „lei”, „ron”, „reducere” sau „%”, afișează „onorariu conform grilei notariale”. Niciodată prețuri sau reduceri la notari.
3. **Avocați:** fără clasamente de tip „cel mai bun avocat” și fără „promovat” sau „sponsorizat” (regulile UNBR). Sortarea implicită e **după distanță**.
4. Un cabinet apare public **doar** dacă `verificat = true` (filtrează explicit și în query).
5. Programarea se creează cu status `in_asteptare`, iar cabinetul o confirmă sau o refuză. Suprapunerile sunt blocate în baza de date.
6. Sloturile libere vin **doar** din funcția SQL `sloturi_libere`.
7. Orele se afișează mereu în fusul **`Europe/Bucharest`**: `Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest' })`. Data trimisă la `sloturi_libere` e ziua calendaristică din România (YYYY-MM-DD).
8. Dacă există login cu Google pe iOS, trebuie să existe și **Sign in with Apple**.
9. **Ștergerea contului** se face din aplicație (Cont → Șterge contul).
10. Placeholder-ele din datele demo de tipul „[PREȚ]” sau „de la [PREȚ]” **nu se afișează**.
11. **Nu inventa date.** Folosește doar datele demo din schemă.

## 6. Link-uri externe (`src/lib/links.ts`, deschise cu `Linking.openURL`)

- Maps: `https://www.google.com/maps/search/?api=1&query=<nume, adresă, oraș>&query_place_id=<place_id>`
- Indicații: `https://www.google.com/maps/dir/?api=1&destination=<adresă, oraș>&destination_place_id=<place_id>`
- WhatsApp: `https://wa.me/<telefon doar cifre>` (în DB e salvat ca `+40712345678`)
- Instagram: `https://instagram.com/<handle>` · Facebook: URL-ul complet din DB
- Telefon: `tel:<telefon>` · Site: adaugă `https://` dacă lipsește
- Ascunde butonul dacă valoarea lipsește.

## 7. Animații — reguli stricte

Totul cu Reanimated 4 și cu valorile de aici:
```ts
EASE_OUT    = 'cubic-bezier(0.23, 1, 0.32, 1)'
EASE_IN_OUT = 'cubic-bezier(0.77, 0, 0.175, 1)'
durate: apăsare 120ms, toggle/selecție 180ms
```
- **Feedback la apăsare** pe tot ce se apasă (componenta `PressableScale`): `scale 0.97` în 120ms la press-in, înapoi la press-out. Folosește **Reanimated CSS transition** (`transitionProperty: 'transform'`, `transitionDuration`, `transitionTimingFunction`) și `pressRetentionOffset` de 16.
- **Chip-uri, ore, zile, opțiuni:** doar schimbare de culoare în 180ms (CSS transition pe `backgroundColor`/`borderColor`/`color`) + `Haptics.selectionAsync()`.
- **Control segmentat:** pastila e un element absolut, fără copii; animezi doar `translateX` în 180ms ease-in-out, plus haptic de selecție.
- **Lista din Caută:** la schimbarea filtrului rândurile se rearanjează cu `itemLayoutAnimation={LinearTransition.duration(200)}`. **Nu** pune `entering` pe rândurile listei virtualizate.
- **Skeleton:** puls de opacitate 1 → 0.45 (CSS animation, 900ms, infinite, alternate).
- **Conținut care înlocuiește un skeleton** (recenzii, grila de ore, mesaje de eroare): `FadeIn.duration(180–200)`.
- **Confirmare** (singurul moment de „încântare”): bifa intră din `scale 0.9` + `opacity 0` în 320ms ease-out. Haptic-ul Success s-a dat deja în momentul răspunsului serverului.
- **Tab-uri:** `NativeTabs` din `expo-router/unstable-native-tabs`, **fără animație între tab-uri**.
- **Tranziții între ecrane:** cele native ale stack-ului, nu le reface în JS.
- **Haptics:** selecție la chip, ore, zile, segment; Success/Error la trimiterea programării; Medium la anulare și la ștergerea contului. Una singură per acțiune, niciodată singurul feedback.
- **Reduce motion** (`useReducedMotion()`): fără scale și fără alunecări, doar opacitate și culoare. Tranzițiile între ecrane devin `animation: 'fade'`.
- Interzis: `Animated` din core, `PanResponder`, `setState` pe fiecare cadru, animarea `width`/`height`/`margin`, `scale(0)`, `Easing.in`.
- În `app.json`: `ios.infoPlist.CADisableMinimumFrameDurationOnPhone = true`.

## 8. Calitatea codului

- React Compiler e activ (`experiments.reactCompiler: true`). Fără `setState` sincron în `useEffect`, fără citirea ref-urilor în render, fără `Date.now()` în render. Stările de încărcare se **derivă** (ex. din cheia cererii curente).
- Toate apelurile Supabase stau în `src/lib/data.ts`. Tipurile tabelelor stau în `src/lib/types.ts`, după schemă.
- Exclude `supabase/functions` din `tsconfig` (e cod Deno).
- La finalul fiecărei etape: `npx tsc --noEmit` și `npx expo lint` fără erori, iar aplicația pornește cu `npx expo start`.

## 9. Configurare app

`app.json`: `name: "Juristo"`, `slug: "juristo"`, `scheme: "juristo"`, `ios.bundleIdentifier` și `android.package` = `ro.juristo.app`, `ios.usesAppleSignIn: true`, splash navy `#0E1A2E`. Plugin-uri: `expo-router`, `expo-splash-screen`, `expo-location` (cu textul „Juristo folosește locația ca să-ți arate cabinetele cele mai apropiate.”), `expo-apple-authentication`, `expo-web-browser`.

## 10. Etape

1. **Etapa 1:** proiectul, `lib/` (supabase, theme, types, links, format, data, hooks), tab-urile Acasă și Caută, ecranul `cabinet/[id]` fără recenzii și hartă, cu date reale din `cabinete`, `profesionisti`, `servicii`. Programări și Cont rămân goale.
2. **Etapa 2:** GoogleReviews, MapCard, SocialButtons, ratingul Google pe carduri, `app.config.ts` cu cheia Maps.
3. **Etapa 3:** login, programare, confirmare, tab-urile Programări și Cont.
4. **Etapa 4** (abia după ce merg cele de sus): un panou web Next.js separat pentru cabinete (rol `cabinet` vede doar cabinetul lui, rol `admin` verifică cabinete).
5. **Etapa 5:** notificări push (`expo-notifications`, token în `profiles.push_token`) și pregătirea publicării cu EAS.

---

## Anexa A — Schema Supabase (o rulez eu; nu o modifica fără să mă întrebi)

```sql
-- =====================================================================
-- Juristo — schema completă Supabase
-- Rulează tot fișierul o singură dată în Supabase → SQL Editor → Run.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------- Tipuri ----------
create type tip_profesie as enum ('avocat', 'notar');
create type rol_utilizator as enum ('client', 'cabinet', 'admin');
create type mod_intalnire as enum ('birou', 'video');
create type status_programare as enum ('in_asteptare', 'confirmata', 'refuzata', 'anulata', 'finalizata');

-- ---------- Profiluri utilizatori ----------
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  rol         rol_utilizator not null default 'client',
  nume        text,
  telefon     text,
  push_token  text,
  created_at  timestamptz not null default now()
);

-- creează automat profilul la înregistrare
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nume)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and rol = 'admin');
$$;

-- ---------- Cabinete ----------
create table public.cabinete (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid references public.profiles(id) on delete set null,
  tip              tip_profesie not null,
  nume             text not null,
  descriere        text,
  adresa           text not null,
  zona             text,
  oras             text not null default 'Cluj-Napoca',
  lat              double precision,
  lng              double precision,
  google_place_id  text,
  site             text,
  instagram        text,          -- doar handle-ul, fără @
  facebook         text,          -- URL complet
  whatsapp         text,          -- format +40712345678
  telefon          text,
  email            text,
  numar_tablou     text,          -- nr. din Tabloul avocaților / UNNPR
  verificat        boolean not null default false,
  created_at       timestamptz not null default now()
);
create index on public.cabinete (tip, oras) where verificat;

-- doar adminul (sau serverul / SQL Editor, unde auth.uid() e null) poate schimba „verificat”
create or replace function public.protect_verificat()
returns trigger language plpgsql as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.verificat := false;
    elsif new.verificat is distinct from old.verificat then
      new.verificat := old.verificat;
    end if;
  end if;
  return new;
end;
$$;

create trigger cabinete_protect_verificat
  before insert or update on public.cabinete
  for each row execute function public.protect_verificat();

-- ---------- Profesioniști ----------
create table public.profesionisti (
  id               uuid primary key default gen_random_uuid(),
  cabinet_id       uuid not null references public.cabinete(id) on delete cascade,
  nume             text not null,
  titlu            text not null,            -- ex: „Avocat · Dreptul familiei”
  specializari     text[] not null default '{}',
  ani_experienta   int,
  limbi            text[] not null default '{RO}',
  poza_url         text,
  activ            boolean not null default true
);
create index on public.profesionisti (cabinet_id);
create index on public.profesionisti using gin (specializari);

-- ---------- Servicii ----------
create table public.servicii (
  id          uuid primary key default gen_random_uuid(),
  cabinet_id  uuid not null references public.cabinete(id) on delete cascade,
  nume        text not null,
  descriere   text,
  durata_min  int not null default 30 check (durata_min between 10 and 480),
  pret_text   text,          -- ex: „300 lei” sau „conform grilei notariale”
  video_ok    boolean not null default true,
  activ       boolean not null default true
);
create index on public.servicii (cabinet_id);

-- ---------- Program de lucru ----------
create table public.program_lucru (
  id               uuid primary key default gen_random_uuid(),
  profesionist_id  uuid not null references public.profesionisti(id) on delete cascade,
  zi_saptamana     smallint not null check (zi_saptamana between 1 and 7),  -- 1 = luni
  ora_start        time not null,
  ora_sfarsit      time not null,
  check (ora_sfarsit > ora_start)
);
create index on public.program_lucru (profesionist_id, zi_saptamana);

-- zile libere / concedii
create table public.zile_libere (
  id               uuid primary key default gen_random_uuid(),
  profesionist_id  uuid not null references public.profesionisti(id) on delete cascade,
  data             date not null,
  motiv            text,
  unique (profesionist_id, data)
);

-- ---------- Programări ----------
create table public.programari (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.profiles(id) on delete cascade,
  cabinet_id       uuid not null references public.cabinete(id) on delete cascade,
  profesionist_id  uuid not null references public.profesionisti(id) on delete cascade,
  serviciu_id      uuid references public.servicii(id) on delete set null,
  start_at         timestamptz not null,
  end_at           timestamptz not null,
  mod              mod_intalnire not null default 'birou',
  status           status_programare not null default 'in_asteptare',
  nota_client      text,
  created_at       timestamptz not null default now(),
  check (end_at > start_at),
  -- blochează suprapunerile pentru programările active
  exclude using gist (
    profesionist_id with =,
    tstzrange(start_at, end_at) with &&
  ) where (status in ('in_asteptare', 'confirmata'))
);
create index on public.programari (client_id, start_at);
create index on public.programari (cabinet_id, start_at);

-- ---------- Favorite ----------
create table public.favorite (
  client_id   uuid not null references public.profiles(id) on delete cascade,
  cabinet_id  uuid not null references public.cabinete(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (client_id, cabinet_id)
);

-- =====================================================================
-- Funcții
-- =====================================================================

-- sloturi libere pentru un profesionist într-o zi (pas de 30 min, ora României)
create or replace function public.sloturi_libere(
  p_profesionist uuid,
  p_data date,
  p_durata_min int default 30
)
returns table (start_at timestamptz)
language sql stable security definer set search_path = public as $$
  with interval_lucru as (
    select pl.ora_start, pl.ora_sfarsit
    from program_lucru pl
    where pl.profesionist_id = p_profesionist
      and pl.zi_saptamana = extract(isodow from p_data)
      and not exists (
        select 1 from zile_libere z
        where z.profesionist_id = p_profesionist and z.data = p_data
      )
  ),
  candidati as (
    select gs as start_at
    from interval_lucru il,
    generate_series(
      ((p_data + il.ora_start) at time zone 'Europe/Bucharest'),
      ((p_data + il.ora_sfarsit) at time zone 'Europe/Bucharest') - make_interval(mins => p_durata_min),
      interval '30 minutes'
    ) as gs
  )
  select c.start_at
  from candidati c
  where c.start_at > now()
    and not exists (
      select 1 from programari pr
      where pr.profesionist_id = p_profesionist
        and pr.status in ('in_asteptare', 'confirmata')
        and tstzrange(pr.start_at, pr.end_at) && tstzrange(c.start_at, c.start_at + make_interval(mins => p_durata_min))
    )
  order by c.start_at;
$$;

-- creează o programare în siguranță (aplicația apelează DOAR asta)
create or replace function public.creeaza_programare(
  p_profesionist uuid,
  p_serviciu uuid,
  p_start timestamptz,
  p_mod mod_intalnire default 'birou',
  p_nota text default null
)
returns public.programari
language plpgsql security definer set search_path = public as $$
declare
  v_cabinet uuid;
  v_durata int;
  v_rez programari;
begin
  if auth.uid() is null then
    raise exception 'Trebuie să fii autentificat';
  end if;

  select s.cabinet_id, s.durata_min into v_cabinet, v_durata
  from servicii s
  join profesionisti p on p.cabinet_id = s.cabinet_id and p.id = p_profesionist
  join cabinete c on c.id = s.cabinet_id and c.verificat
  where s.id = p_serviciu and s.activ and p.activ;

  if v_cabinet is null then
    raise exception 'Serviciu sau profesionist invalid';
  end if;

  if not exists (
    select 1 from sloturi_libere(p_profesionist, (p_start at time zone 'Europe/Bucharest')::date, v_durata) sl
    where sl.start_at = p_start
  ) then
    raise exception 'Ora aleasă nu mai este disponibilă';
  end if;

  insert into programari (client_id, cabinet_id, profesionist_id, serviciu_id, start_at, end_at, mod, nota_client)
  values (auth.uid(), v_cabinet, p_profesionist, p_serviciu, p_start, p_start + make_interval(mins => v_durata), p_mod, p_nota)
  returning * into v_rez;

  return v_rez;
end;
$$;

-- schimbă statusul: clientul poate doar anula; cabinetul confirmă / refuză / finalizează
create or replace function public.schimba_status_programare(p_id uuid, p_status status_programare)
returns public.programari
language plpgsql security definer set search_path = public as $$
declare
  v programari;
  v_e_owner boolean;
begin
  select * into v from programari where id = p_id for update;
  if v.id is null then raise exception 'Programare inexistentă'; end if;

  select exists (select 1 from cabinete where id = v.cabinet_id and owner_id = auth.uid()) into v_e_owner;

  if v.client_id = auth.uid() and p_status = 'anulata' and v.status in ('in_asteptare', 'confirmata') then
    null;
  elsif v_e_owner and (
       (v.status = 'in_asteptare' and p_status in ('confirmata', 'refuzata'))
    or (v.status = 'confirmata'   and p_status in ('finalizata', 'anulata'))
  ) then
    null;
  elsif public.is_admin() then
    null;
  else
    raise exception 'Schimbare de status nepermisă';
  end if;

  update programari set status = p_status where id = p_id returning * into v;
  return v;
end;
$$;

-- șterge contul utilizatorului curent (cerință App Store / Google Play)
create or replace function public.sterge_contul_meu()
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Neautentificat'; end if;
  delete from auth.users where id = auth.uid();
end;
$$;

-- =====================================================================
-- Securitate (Row Level Security)
-- =====================================================================
alter table public.profiles       enable row level security;
alter table public.cabinete       enable row level security;
alter table public.profesionisti  enable row level security;
alter table public.servicii       enable row level security;
alter table public.program_lucru  enable row level security;
alter table public.zile_libere    enable row level security;
alter table public.programari     enable row level security;
alter table public.favorite       enable row level security;

-- profiles
create policy "profil propriu - citire" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profil propriu - editare" on public.profiles for update using (id = auth.uid())
  with check (id = auth.uid() and rol = (select rol from public.profiles where id = auth.uid()));

-- cabinete
create policy "cabinete publice" on public.cabinete for select
  using (verificat or owner_id = auth.uid() or public.is_admin());
create policy "cabinet - creare" on public.cabinete for insert with check (owner_id = auth.uid());
create policy "cabinet - editare" on public.cabinete for update
  using (owner_id = auth.uid() or public.is_admin());

-- helper: e proprietarul cabinetului?
create or replace function public.e_owner_cabinet(p_cabinet uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from cabinete where id = p_cabinet and owner_id = auth.uid());
$$;

create or replace function public.cabinet_vizibil(p_cabinet uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from cabinete where id = p_cabinet and verificat);
$$;

-- profesionisti
create policy "profesionisti - citire" on public.profesionisti for select
  using (public.cabinet_vizibil(cabinet_id) or public.e_owner_cabinet(cabinet_id) or public.is_admin());
create policy "profesionisti - scriere" on public.profesionisti for all
  using (public.e_owner_cabinet(cabinet_id) or public.is_admin())
  with check (public.e_owner_cabinet(cabinet_id) or public.is_admin());

-- servicii
create policy "servicii - citire" on public.servicii for select
  using (public.cabinet_vizibil(cabinet_id) or public.e_owner_cabinet(cabinet_id) or public.is_admin());
create policy "servicii - scriere" on public.servicii for all
  using (public.e_owner_cabinet(cabinet_id) or public.is_admin())
  with check (public.e_owner_cabinet(cabinet_id) or public.is_admin());

-- program_lucru + zile_libere (prin profesionist)
create policy "program - citire" on public.program_lucru for select using (true);
create policy "program - scriere" on public.program_lucru for all
  using (public.e_owner_cabinet((select cabinet_id from public.profesionisti where id = profesionist_id)) or public.is_admin())
  with check (public.e_owner_cabinet((select cabinet_id from public.profesionisti where id = profesionist_id)) or public.is_admin());

create policy "zile libere - citire" on public.zile_libere for select using (true);
create policy "zile libere - scriere" on public.zile_libere for all
  using (public.e_owner_cabinet((select cabinet_id from public.profesionisti where id = profesionist_id)) or public.is_admin())
  with check (public.e_owner_cabinet((select cabinet_id from public.profesionisti where id = profesionist_id)) or public.is_admin());

-- programari: citire de client sau cabinet; scrierea se face DOAR prin funcțiile de mai sus
create policy "programari - citire" on public.programari for select
  using (client_id = auth.uid() or public.e_owner_cabinet(cabinet_id) or public.is_admin());

-- favorite
create policy "favorite proprii" on public.favorite for all
  using (client_id = auth.uid()) with check (client_id = auth.uid());

-- =====================================================================
-- DATE DEMO (fictive) — șterge-le înainte de lansare:
--   delete from public.cabinete where google_place_id is null and owner_id is null;
-- =====================================================================
insert into public.cabinete (id, tip, nume, descriere, adresa, zona, lat, lng, site, instagram, facebook, whatsapp, telefon, verificat) values
('00000000-0000-0000-0000-0000000000a1', 'avocat', 'Cabinet Av. Andrei Mureșan', 'Litigii civile, contracte de vânzare-cumpărare, partaje și recuperări de creanțe.', 'Str. Memorandumului 10', 'Centru', 46.7692, 23.5862, 'https://example.com', 'example', 'https://facebook.com/example', '+40700000001', '+40700000001', true),
('00000000-0000-0000-0000-0000000000a2', 'avocat', 'Cabinet Av. Ioana Pop', 'Divorțuri, custodie, pensie de întreținere și partajul bunurilor comune.', 'Bd. 21 Decembrie 1989 25', 'Centru', 46.7718, 23.5975, 'https://example.com', 'example', 'https://facebook.com/example', '+40700000002', '+40700000002', true),
('00000000-0000-0000-0000-0000000000a3', 'avocat', 'Ilieș & Asociații', 'Înființări de firme, contracte comerciale, relații de muncă și dispute între asociați.', 'Str. Republicii 40', 'Andrei Mureșanu', 46.7620, 23.5880, 'https://example.com', 'example', 'https://facebook.com/example', '+40700000003', '+40700000003', true),
('00000000-0000-0000-0000-0000000000a4', 'avocat', 'Cabinet Av. Elena Crișan', 'Asistență în urmărirea penală și în instanță, plângeri penale.', 'Calea Dorobanților 50', 'Gheorgheni', 46.7705, 23.6080, null, null, null, '+40700000004', '+40700000004', true),
('00000000-0000-0000-0000-0000000000b1', 'notar', 'BNP Maria Suciu', 'Vânzări-cumpărări, dezbateri succesorale și donații. Trimitem din timp lista actelor.', 'Piața Unirii 5', 'Centru', 46.7697, 23.5899, 'https://example.com', 'example', 'https://facebook.com/example', '+40700000005', '+40700000005', true),
('00000000-0000-0000-0000-0000000000b2', 'notar', 'BNP Vlad Moldovan', 'Procuri, declarații, legalizări și contracte de închiriere.', 'Str. Horea 12', 'Centru', 46.7760, 23.5870, 'https://example.com', null, 'https://facebook.com/example', '+40700000006', '+40700000006', true),
('00000000-0000-0000-0000-0000000000b3', 'notar', 'BNP Ana Rusu', 'Succesiuni, testamente și certificate de moștenitor.', 'Str. Observatorului 30', 'Zorilor', 46.7550, 23.5880, null, 'example', null, '+40700000007', '+40700000007', true);

insert into public.profesionisti (id, cabinet_id, nume, titlu, specializari, ani_experienta, limbi) values
('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000000a1', 'Av. Andrei Mureșan', 'Avocat · Drept civil și imobiliar', '{Civil,Imobiliar}', 12, '{RO,EN}'),
('00000000-0000-0000-0000-0000000001a2', '00000000-0000-0000-0000-0000000000a2', 'Av. Ioana Pop', 'Avocat · Dreptul familiei', '{Familie,Civil}', 9, '{RO,EN,FR}'),
('00000000-0000-0000-0000-0000000001a3', '00000000-0000-0000-0000-0000000000a3', 'Av. Radu Ilieș', 'Avocat · Drept comercial', '{Comercial,Muncă}', 15, '{RO,EN}'),
('00000000-0000-0000-0000-0000000001a4', '00000000-0000-0000-0000-0000000000a4', 'Av. Elena Crișan', 'Avocat · Drept penal', '{Penal}', 11, '{RO,DE}'),
('00000000-0000-0000-0000-0000000001b1', '00000000-0000-0000-0000-0000000000b1', 'Notar Maria Suciu', 'Notar public · Imobiliare și succesiuni', '{Imobiliare,Succesiuni,Donații}', 18, '{RO,EN}'),
('00000000-0000-0000-0000-0000000001b2', '00000000-0000-0000-0000-0000000000b2', 'Notar Vlad Moldovan', 'Notar public · Procuri și legalizări', '{Procuri,Legalizări,Imobiliare}', 10, '{RO,EN,HU}'),
('00000000-0000-0000-0000-0000000001b3', '00000000-0000-0000-0000-0000000000b3', 'Notar Ana Rusu', 'Notar public · Succesiuni', '{Succesiuni,Donații,Procuri}', 14, '{RO,EN}');

-- servicii: 3 pentru fiecare avocat, 3 pentru fiecare notar
insert into public.servicii (cabinet_id, nume, durata_min, pret_text, video_ok)
select c.id, s.nume, s.durata, s.pret, s.video
from public.cabinete c
join (values
  ('avocat'::tip_profesie, 'Consultație inițială', 30, '[PREȚ]', true),
  ('avocat', 'Analiză și redactare contract', 60, 'de la [PREȚ]', true),
  ('avocat', 'Reprezentare în instanță', 60, 'ofertă după analiza dosarului', false),
  ('notar', 'Consultație notarială', 15, 'gratuit · lista actelor necesare', true),
  ('notar', 'Autentificare act', 60, 'onorariu conform grilei notariale', false),
  ('notar', 'Legalizare copie sau semnătură', 15, 'onorariu conform grilei notariale', false)
) as s(tip, nume, durata, pret, video) on s.tip = c.tip;

-- program: luni–vineri 09:00–17:00 pentru toți
insert into public.program_lucru (profesionist_id, zi_saptamana, ora_start, ora_sfarsit)
select p.id, d, '09:00', '17:00'
from public.profesionisti p, generate_series(1, 5) as d;
```

## Anexa B — Edge Function `supabase/functions/google-place/index.ts` (copiaz-o exact)

```ts
// Supabase Edge Function: google-place
// Aduce ratingul, numărul de recenzii și ultimele (max. 5) recenzii Google pentru un cabinet.
// Cheia Google rămâne pe server. Setare: supabase secrets set GOOGLE_PLACES_KEY=xxx
// Deploy:  supabase functions deploy google-place
// Apel din aplicație: supabase.functions.invoke('google-place', { body: { placeId } })

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });

// cache scurt în memorie (permis de termenii Google; NU salvăm recenziile în baza de date)
const cache = new Map<string, { at: number; data: unknown }>();
const TTL_MS = 60 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  let placeId = '';
  try {
    ({ placeId } = await req.json());
  } catch {
    return json({ error: 'Body invalid' }, 400);
  }
  if (!placeId || !/^[A-Za-z0-9_-]{10,300}$/.test(placeId)) {
    return json({ error: 'placeId invalid' }, 400);
  }

  const hit = cache.get(placeId);
  if (hit && Date.now() - hit.at < TTL_MS) return json(hit.data);

  const key = Deno.env.get('GOOGLE_PLACES_KEY');
  if (!key) return json({ error: 'Lipsește GOOGLE_PLACES_KEY' }, 500);

  const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}?languageCode=ro`, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'rating,userRatingCount,googleMapsUri,websiteUri,nationalPhoneNumber,reviews',
    },
  });

  if (!res.ok) {
    return json({ error: 'Google Places a răspuns cu eroare', status: res.status }, 502);
  }

  const p = await res.json();
  const data = {
    rating: p.rating ?? null,
    total: p.userRatingCount ?? 0,
    mapsUrl: p.googleMapsUri ?? null,
    website: p.websiteUri ?? null,
    phone: p.nationalPhoneNumber ?? null,
    reviews: (p.reviews ?? []).map((r: any) => ({
      autor: r.authorAttribution?.displayName ?? 'Utilizator Google',
      autorUrl: r.authorAttribution?.uri ?? null,
      poza: r.authorAttribution?.photoUri ?? null,
      stele: r.rating ?? null,
      text: r.text?.text ?? r.originalText?.text ?? '',
      cand: r.relativePublishTimeDescription ?? '',
    })),
  };

  cache.set(placeId, { at: Date.now(), data });
  return json(data);
});
```
