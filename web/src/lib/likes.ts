import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInPath, useUser } from './auth';
import { likes, pb } from './pb';

interface LikeOptions {
  /** Called right away with +1 or -1, and again with the opposite value after a failure. */
  onCountChange?: (cardId: string, delta: number) => void;
}

/**
 * Hearts for a list of cards. The state flips right away and goes back if the request
 * fails. A guest gets sent to the sign-in page and comes back afterwards.
 */
export function useLikes(cardIds: string[], options: LikeOptions = {}) {
  const user = useUser();
  const navigate = useNavigate();
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const likeIds = useRef<Record<string, string>>({});
  const loaded = useRef(new Set<string>());
  const pending = useRef(new Set<string>());
  const onCountChange = useRef(options.onCountChange);
  onCountChange.current = options.onCountChange;

  const userId = user?.id;
  useEffect(() => {
    loaded.current = new Set();
    likeIds.current = {};
    setLiked({});
  }, [userId]);

  const idsKey = cardIds.join(',');
  useEffect(() => {
    if (!userId || !idsKey) return;
    const missing = idsKey.split(',').filter((id) => !loaded.current.has(id));
    if (missing.length === 0) return;
    missing.forEach((id) => loaded.current.add(id));

    const cardsFilter = missing.map((id, i) => pb.filter(`card = {:c${i}}`, { [`c${i}`]: id })).join(' || ');
    likes()
      .getFullList({ filter: `${pb.filter('user = {:user}', { user: userId })} && (${cardsFilter})`, fields: 'id,card' })
      .then((records) => {
        const found: Record<string, boolean> = {};
        for (const record of records) {
          likeIds.current[record.card] = record.id;
          found[record.card] = true;
        }
        setLiked((current) => ({ ...current, ...found }));
      })
      .catch(() => {
        missing.forEach((id) => loaded.current.delete(id));
      });
  }, [userId, idsKey]);

  const toggle = useCallback(
    async (cardId: string) => {
      if (!userId) {
        navigate(signInPath(window.location.pathname + window.location.search));
        return;
      }
      if (pending.current.has(cardId)) return;
      pending.current.add(cardId);

      const wasLiked = Boolean(likeIds.current[cardId]);
      const delta = wasLiked ? -1 : 1;
      setLiked((current) => ({ ...current, [cardId]: !wasLiked }));
      onCountChange.current?.(cardId, delta);

      try {
        if (wasLiked) {
          await likes().delete(likeIds.current[cardId]!);
          delete likeIds.current[cardId];
        } else {
          const record = await likes().create({ user: userId, card: cardId });
          likeIds.current[cardId] = record.id;
        }
      } catch {
        setLiked((current) => ({ ...current, [cardId]: wasLiked }));
        onCountChange.current?.(cardId, -delta);
      } finally {
        pending.current.delete(cardId);
      }
    },
    [navigate, userId],
  );

  return { liked, toggle };
}
