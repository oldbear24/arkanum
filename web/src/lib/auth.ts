import { useSyncExternalStore } from 'react';
import { pb, users, type UserRecord } from './pb';

// The store parses a new object from localStorage on every read, while
// useSyncExternalStore needs the same object until something really changes.
let cachedRecord = pb.authStore.record as UserRecord | null;
pb.authStore.onChange(() => {
  cachedRecord = pb.authStore.record as UserRecord | null;
});

function subscribe(onChange: () => void) {
  return pb.authStore.onChange(() => onChange());
}

function currentUser(): UserRecord | null {
  return pb.authStore.isValid ? cachedRecord : null;
}

/** The signed-in user, or null for a guest. Re-renders on sign-in and sign-out. */
export function useUser(): UserRecord | null {
  return useSyncExternalStore(subscribe, currentUser);
}

export function getUser(): UserRecord | null {
  return currentUser();
}

export function signOut() {
  pb.authStore.clear();
}

let refreshed = false;

/** Checks a remembered session once at startup. A rejected token signs the user out. */
export async function refreshSession() {
  if (refreshed || !pb.authStore.isValid) return;
  refreshed = true;
  try {
    await users().authRefresh();
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 401 || status === 403 || status === 404) pb.authStore.clear();
  }
}

/** Only same-site paths are valid redirect targets after signing in. */
export function safeNext(next: string | null | undefined, fallback = '/'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}

export function signInPath(next?: string): string {
  return next ? `/prihlaseni?next=${encodeURIComponent(next)}` : '/prihlaseni';
}

export function profilePath(handle: string): string {
  return `/@${handle}`;
}
