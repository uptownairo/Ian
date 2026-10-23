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
