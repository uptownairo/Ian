import type { Serviciu, TipProfesie } from './types';

/** Notari: onorariile sunt reglementate → niciodată preț sau reducere (regula 2). */
export function pretAfisat(s: Serviciu, tip: TipProfesie) {
  const t = s.pret_text?.trim();
  if (tip === 'notar') {
    if (!t || /\d|lei|ron|reducere|%/i.test(t)) return 'onorariu conform grilei notariale';
    return t;
  }
  // ascunde placeholder-ele necompletate din datele demo, ex. „[PREȚ]”
  if (!t || /\[.*\]/.test(t)) return null;
  return t;
}
