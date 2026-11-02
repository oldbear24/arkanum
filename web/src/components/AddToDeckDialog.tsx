import { useEffect, useState, type FormEvent } from 'react';
import { cs } from '../i18n/cs';
import { createDeck, myDecks } from '../lib/decks';
import { decks, type DeckRecord } from '../lib/pb';
import styles from './AddToDeckDialog.module.css';
import { Dialog, Field, ui } from './ui';

const t = cs.deck;

interface AddToDeckDialogProps {
  cardId: string;
  ownerId: string;
  onClose: () => void;
}

export function AddToDeckDialog({ cardId, ownerId, onClose }: AddToDeckDialogProps) {
  const [list, setList] = useState<DeckRecord[] | null>(null);
  const [name, setName] = useState('');
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    myDecks(ownerId)
      .then((records) => {
        if (active) setList(records);
      })
      .catch(() => {
        if (active) {
          setList([]);
          setFailed(true);
        }
      });
    return () => {
      active = false;
    };
  }, [ownerId]);

  const toggle = async (deck: DeckRecord) => {
    const contains = deck.cards.includes(cardId);
    setBusy(deck.id);
    setFailed(false);
    try {
      const saved = await decks().update(deck.id, contains ? { 'cards-': cardId } : { 'cards+': cardId });
      setList((current) => current?.map((item) => (item.id === saved.id ? saved : item)) ?? null);
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy('new');
    setFailed(false);
    try {
      const created = await createDeck(ownerId, trimmed, [cardId]);
      setList((current) => [created, ...(current ?? [])]);
      setName('');
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog open title={t.dialogTitle} onClose={onClose}>
      <div className={styles.group}>
        <h3 className={ui.smallHeading}>{t.myDecks}</h3>
        {list === null && <p className={ui.hint}>{cs.common.loading}</p>}
        {list?.length === 0 && <p className={ui.hint}>{t.none}</p>}
        <ul className={styles.list}>
          {list?.map((deck) => {
            const contains = deck.cards.includes(cardId);
            return (
              <li key={deck.id} className={styles.row}>
                <span className={styles.name}>{deck.name}</span>
                <button
                  type="button"
                  className={ui.outline}
                  aria-pressed={contains}
                  aria-label={(contains ? t.removeFromThis : t.addToThis) + deck.name}
                  disabled={busy === deck.id}
                  onClick={() => void toggle(deck)}
                >
                  {contains ? t.added : t.add}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <form className={styles.create} onSubmit={(e) => void create(e)}>
        <div className={styles.createField}>
          <Field label={t.newDeckName} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className={ui.primary} disabled={busy === 'new' || !name.trim()}>
          {t.createAndAdd}
        </button>
      </form>
      {failed && (
        <p className={ui.alert} role="alert">
          {t.saveFailed}
        </p>
      )}
    </Dialog>
  );
}
