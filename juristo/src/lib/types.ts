// Tipurile tabelelor din supabase/schema.sql

export type TipProfesie = 'avocat' | 'notar';
export type RolUtilizator = 'client' | 'cabinet' | 'admin';
export type ModIntalnire = 'birou' | 'video';
export type StatusProgramare = 'in_asteptare' | 'confirmata' | 'refuzata' | 'anulata' | 'finalizata';

export type Profile = {
  id: string;
  rol: RolUtilizator;
  nume: string | null;
  telefon: string | null;
  push_token: string | null;
  created_at: string;
};

export type Cabinet = {
  id: string;
  owner_id: string | null;
  tip: TipProfesie;
  nume: string;
  descriere: string | null;
  adresa: string;
  zona: string | null;
  oras: string;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  site: string | null;
  instagram: string | null;
  facebook: string | null;
  whatsapp: string | null;
  telefon: string | null;
  email: string | null;
  numar_tablou: string | null;
  verificat: boolean;
  created_at: string;
};

export type Profesionist = {
  id: string;
  cabinet_id: string;
  nume: string;
  titlu: string;
  specializari: string[];
  ani_experienta: number | null;
  limbi: string[];
  poza_url: string | null;
  activ: boolean;
};

export type Serviciu = {
  id: string;
  cabinet_id: string;
  nume: string;
  descriere: string | null;
  durata_min: number;
  pret_text: string | null;
  video_ok: boolean;
  activ: boolean;
};

export type ProgramLucru = {
  id: string;
  profesionist_id: string;
  zi_saptamana: number;
  ora_start: string;
  ora_sfarsit: string;
};

export type ZiLibera = {
  id: string;
  profesionist_id: string;
  data: string;
  motiv: string | null;
};

export type Programare = {
  id: string;
  client_id: string;
  cabinet_id: string;
  profesionist_id: string;
  serviciu_id: string | null;
  start_at: string;
  end_at: string;
  mod: ModIntalnire;
  status: StatusProgramare;
  nota_client: string | null;
  created_at: string;
};

export type Favorit = {
  client_id: string;
  cabinet_id: string;
  created_at: string;
};

// Rânduri compuse folosite în UI
export type CabinetCuProfesionisti = Cabinet & { profesionisti: Profesionist[] };

export type CabinetComplet = Cabinet & {
  profesionisti: Profesionist[];
  servicii: Serviciu[];
};

export type ProgramareDetaliata = Programare & {
  cabinete: Pick<Cabinet, 'id' | 'nume' | 'tip' | 'adresa'> | null;
  profesionisti: Pick<Profesionist, 'id' | 'nume'> | null;
  servicii: Pick<Serviciu, 'id' | 'nume' | 'durata_min'> | null;
};

// Răspunsul Edge Function `google-place`
export type GoogleReview = {
  autor: string;
  autorUrl: string | null;
  poza: string | null;
  stele: number | null;
  text: string;
  cand: string;
};

export type GooglePlace = {
  rating: number | null;
  total: number;
  mapsUrl: string | null;
  website: string | null;
  phone: string | null;
  reviews: GoogleReview[];
};
