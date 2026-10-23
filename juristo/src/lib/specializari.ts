import type { TipProfesie } from './types';

// Chip-urile rapide de pe Acasă → deschid Caută deja filtrat (tip + specializare din profesionisti.specializari)
export const chipuriRapide: { label: string; tip: TipProfesie; spec: string }[] = [
  { label: 'Divorț', tip: 'avocat', spec: 'Familie' },
  { label: 'Vânzare apartament', tip: 'notar', spec: 'Imobiliare' },
  { label: 'Succesiune', tip: 'notar', spec: 'Succesiuni' },
  { label: 'Procură', tip: 'notar', spec: 'Procuri' },
  { label: 'Contract de muncă', tip: 'avocat', spec: 'Muncă' },
  { label: 'Firmă nouă', tip: 'avocat', spec: 'Comercial' },
];
