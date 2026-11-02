import { useEffect, useState } from 'react';
import { pb } from '../../lib/pb';

export interface PresenceUser {
  id: string;
  handle: string;
  displayName: string;
}

const HEARTBEAT_MS = 20_000;

/** Who else has this card open. The server forgets people who stop sending heartbeats. */
export function usePresence(cardId: string, selfId: string): PresenceUser[] {
  const [users, setUsers] = useState<PresenceUser[]>([]);

  useEffect(() => {
    const path = `/api/arkanum/presence/${encodeURIComponent(cardId)}`;
    const topic = `arkanum/presence/${cardId}`;
    let active = true;
    let unsubscribe: (() => Promise<void>) | undefined;

    const apply = (data: { users?: PresenceUser[] }) => {
      if (active) setUsers(data.users ?? []);
    };
    const beat = () => {
      pb.send<{ users: PresenceUser[] }>(path, { method: 'POST' })
        .then(apply)
        .catch(() => undefined);
    };

    pb.realtime
      .subscribe(topic, apply)
      .then((stop) => {
        if (active) unsubscribe = stop;
        else void stop();
      })
      .catch(() => undefined);

    beat();
    const interval = setInterval(beat, HEARTBEAT_MS);

    const leave = () => {
      void fetch(pb.buildURL(path), { method: 'DELETE', keepalive: true, headers: { Authorization: pb.authStore.token } }).catch(() => undefined);
    };
    window.addEventListener('pagehide', leave);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('pagehide', leave);
      void unsubscribe?.();
      leave();
    };
  }, [cardId]);

  return users.filter((user) => user.id !== selfId);
}
