import { supabase } from './supabase';
import type {
  CabinetComplet,
  CabinetCuProfesionisti,
  GooglePlace,
  Profile,
  ProgramareDetaliata,
  TipProfesie,
} from './types';

// Cabinetele publice (RLS + filtru explicit pe verificat, regula 4)
export async function listCabinete(tip?: TipProfesie) {
  let q = supabase
    .from('cabinete')
    .select('*, profesionisti(*)')
    .eq('verificat', true)
    .eq('profesionisti.activ', true);
  if (tip) q = q.eq('tip', tip);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CabinetCuProfesionisti[];
}

export async function getCabinet(id: string) {
  const { data, error } = await supabase
    .from('cabinete')
    .select('*, profesionisti(*), servicii(*)')
    .eq('id', id)
    .eq('verificat', true)
    .eq('profesionisti.activ', true)
    .eq('servicii.activ', true)
    .maybeSingle();
  if (error) throw error;
  return data as CabinetComplet | null;
}

// Sloturile vin DOAR din funcția SQL (regula 6)
export async function sloturiLibere(profesionistId: string, data: string, durataMin: number) {
  const { data: rows, error } = await supabase.rpc('sloturi_libere', {
    p_profesionist: profesionistId,
    p_data: data,
    p_durata_min: durataMin,
  });
  if (error) throw error;
  return ((rows ?? []) as { start_at: string }[]).map((r) => r.start_at);
}

export async function creeazaProgramare(args: {
  profesionistId: string;
  serviciuId: string;
  start: string;
  mod: 'birou' | 'video';
  nota?: string;
}) {
  const { data, error } = await supabase.rpc('creeaza_programare', {
    p_profesionist: args.profesionistId,
    p_serviciu: args.serviciuId,
    p_start: args.start,
    p_mod: args.mod,
    p_nota: args.nota || null,
  });
  if (error) throw error;
  return data as { id: string };
}

export async function programarileMele() {
  const { data, error } = await supabase
    .from('programari')
    .select('*, cabinete(id, nume, tip, adresa), profesionisti(id, nume), servicii(id, nume, durata_min)')
    .order('start_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ProgramareDetaliata[];
}

export async function getProgramare(id: string) {
  const { data, error } = await supabase
    .from('programari')
    .select('*, cabinete(id, nume, tip, adresa), profesionisti(id, nume), servicii(id, nume, durata_min)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data as ProgramareDetaliata | null;
}

export async function anuleazaProgramare(id: string) {
  const { error } = await supabase.rpc('schimba_status_programare', { p_id: id, p_status: 'anulata' });
  if (error) throw error;
}

export async function getProfil(id: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Profile | null;
}

export async function updateProfil(id: string, patch: { nume?: string | null; telefon?: string | null }) {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  if (error) throw error;
}

export async function stergeContul() {
  const { error } = await supabase.rpc('sterge_contul_meu');
  if (error) throw error;
  await supabase.auth.signOut();
}

// ---------- Google Places (prin Edge Function, regula 1) ----------
// Cache doar în memorie, pe durata sesiunii — recenziile nu se salvează nicăieri.
const placeCache = new Map<string, Promise<GooglePlace | null>>();

export function googlePlace(placeId: string) {
  let p = placeCache.get(placeId);
  if (!p) {
    p = supabase.functions
      .invoke<GooglePlace>('google-place', { body: { placeId } })
      .then(({ data, error }) => (error ? null : (data ?? null)))
      .catch(() => null);
    placeCache.set(placeId, p);
    // la eșec, permite reîncercarea la următoarea deschidere
    p.then((r) => {
      if (!r) placeCache.delete(placeId);
    });
  }
  return p;
}

// ---------- Primul slot liber azi (pentru „Disponibili azi”) ----------
const azi = new Map<string, Promise<string | null>>();

export function primulSlotAzi(profesionistId: string, ziIso: string) {
  const key = `${profesionistId}:${ziIso}`;
  let p = azi.get(key);
  if (!p) {
    p = sloturiLibere(profesionistId, ziIso, 30)
      .then((s) => s[0] ?? null)
      .catch(() => null);
    azi.set(key, p);
  }
  return p;
}
