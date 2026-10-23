import * as Location from 'expo-location';
import { useCallback, useEffect, useState, type DependencyList } from 'react';

import { googlePlace } from './data';
import type { GooglePlace } from './types';

type AsyncState<T> = {
  load: (() => Promise<T>) | null;
  data: T | undefined;
  error: unknown;
  refreshing: boolean;
};

/**
 * Rulează o funcție async și ține minte rezultatul. `loading` e derivat: e adevărat
 * până când rezultatul aparține ultimei versiuni a funcției (deps schimbate).
 */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps);
  const [state, setState] = useState<AsyncState<T>>({
    load: null,
    data: undefined,
    error: null,
    refreshing: false,
  });

  const settle = useCallback(
    async (p: Promise<T>, isAlive: () => boolean = () => true): Promise<void> => {
      try {
        const data = await p;
        if (isAlive()) setState({ load, data, error: null, refreshing: false });
      } catch (error) {
        if (isAlive()) setState((s) => ({ load, data: s.data, error, refreshing: false }));
      }
    },
    [load],
  );

  useEffect(() => {
    let alive = true;
    settle(load(), () => alive);
    return () => {
      alive = false;
    };
  }, [load, settle]);

  /** Reîncarcă; `silent` = fără indicator de refresh (ex. la revenirea pe ecran). */
  const reload = useCallback(
    (silent = false) => {
      if (!silent) setState((s) => ({ ...s, refreshing: true }));
      return settle(load());
    },
    [load, settle],
  );

  return {
    data: state.data,
    error: state.error,
    loading: state.load !== load,
    refreshing: state.refreshing,
    reload,
    refresh: () => reload(false),
  };
}

/** Ratingul Google al unui cabinet; cerere separată, în cache, ca să nu încetinească lista. */
export function useGooglePlace(placeId: string | null | undefined) {
  const [state, setState] = useState<{ id: string; place: GooglePlace | null } | null>(null);

  useEffect(() => {
    if (!placeId) return;
    let alive = true;
    googlePlace(placeId).then((place) => alive && setState({ id: placeId, place }));
    return () => {
      alive = false;
    };
  }, [placeId]);

  const current = placeId && state?.id === placeId ? state : null;
  return { place: current?.place ?? null, loading: !!placeId && !current };
}

// Centrul Clujului: folosit când utilizatorul nu dă acces la locație
export const CLUJ = { lat: 46.7712, lng: 23.6236 };

let cached: { lat: number; lng: number } | null = null;

/** Poziția utilizatorului (sau centrul Clujului). Cere permisiunea o singură dată. */
export function useLocatie() {
  const [pos, setPos] = useState(cached ?? CLUJ);
  const [precisa, setPrecisa] = useState(!!cached);

  useEffect(() => {
    if (cached) return;
    let alive = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const last = await Location.getLastKnownPositionAsync();
        const p = last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
        cached = { lat: p.coords.latitude, lng: p.coords.longitude };
        if (alive) {
          setPos(cached);
          setPrecisa(true);
        }
      } catch {
        // rămânem pe centrul orașului
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { pos, precisa };
}
