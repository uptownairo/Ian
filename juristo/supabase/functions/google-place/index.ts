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
