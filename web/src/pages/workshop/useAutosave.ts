import { useCallback, useEffect, useRef, useState } from 'react';
import { normalizeCard } from '../../card/normalize';
import type { CardDoc } from '../../card/spec';
import { cards, isNetworkError, type CardRecord } from '../../lib/pb';

export const AUTOSAVE_DELAY_MS = 800;
const RETRY_DELAY_MS = 5000;

export type SaveState = 'saved' | 'saving' | 'offline' | 'error';

/** A stable form for comparing: the same card always serializes to the same text. */
export function serializeDoc(doc: CardDoc): string {
  return JSON.stringify(normalizeCard(doc));
}

function toPayload(doc: CardDoc, templateId: string | undefined) {
  const { title, family, formatW, formatH, look, content, meaning, artworkTransform } = doc;
  return { title, family, formatW, formatH, look, content, meaning, artworkTransform, ...(templateId ? { template: templateId } : {}) };
}

interface AutosaveOptions {
  cardId: string;
  doc: CardDoc;
  templateId: (family: CardDoc['family']) => string | undefined;
  onSaved?: (record: CardRecord) => void;
}

/**
 * Saves the card 800 ms after the last change. One request runs at a time, and when the
 * card changed during it, another one follows. Without a connection it keeps retrying.
 */
export function useAutosave({ cardId, doc, templateId, onSaved }: AutosaveOptions) {
  const [state, setState] = useState<SaveState>('saved');
  const savedJson = useRef(serializeDoc(doc));
  const latest = useRef(doc);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlight = useRef(false);
  const options = useRef({ templateId, onSaved });
  options.current = { templateId, onSaved };
  latest.current = doc;

  const isDirty = useCallback(() => serializeDoc(latest.current) !== savedJson.current, []);

  const flush = useCallback(
    async (keepalive = false): Promise<boolean> => {
      clearTimeout(timer.current);
      if (inFlight.current) return false;
      const json = serializeDoc(latest.current);
      if (json === savedJson.current) {
        setState(navigator.onLine === false ? 'offline' : 'saved');
        return true;
      }

      inFlight.current = true;
      setState('saving');
      try {
        const record = await cards().update(cardId, toPayload(latest.current, options.current.templateId(latest.current.family)), { keepalive });
        savedJson.current = json;
        inFlight.current = false;
        options.current.onSaved?.(record);
        if (isDirty()) return await flush(keepalive);
        setState('saved');
        return true;
      } catch (error) {
        inFlight.current = false;
        if (isNetworkError(error) || navigator.onLine === false) {
          setState('offline');
          timer.current = setTimeout(() => void flush(), RETRY_DELAY_MS);
        } else {
          setState('error');
        }
        return false;
      }
    },
    [cardId, isDirty],
  );

  const docJson = serializeDoc(doc);
  useEffect(() => {
    if (docJson === savedJson.current) return undefined;
    setState(navigator.onLine === false ? 'offline' : 'saving');
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    return undefined;
  }, [docJson, flush]);

  useEffect(() => {
    const goOnline = () => void flush();
    const goOffline = () => setState('offline');
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    if (navigator.onLine === false) setState('offline');
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [flush]);

  // Do not lose the last 800 ms when leaving the page or the workshop.
  useEffect(() => {
    const saveNow = () => {
      if (isDirty()) void flush(true);
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') saveNow();
    };
    window.addEventListener('pagehide', saveNow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', saveNow);
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(timer.current);
      saveNow();
    };
  }, [flush, isDirty]);

  /** Takes in a change from a co-author. Returns false when local edits win. */
  const receive = useCallback(
    (remote: CardDoc) => {
      const dirty = isDirty();
      savedJson.current = serializeDoc(remote);
      return !dirty;
    },
    [isDirty],
  );

  return { state, flush, receive, isDirty };
}
