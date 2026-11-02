import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Card3D } from '../card/Card3D';
import type { CardParams } from '../card/resolve';
import type { Edge, Palette, Visibility } from '../card/spec';
import tileStyles from '../components/CardTile.module.css';
import { CardTile } from '../components/CardTile';
import { Icon } from '../components/Icon';
import { Dialog, Field, TextAreaField, ui } from '../components/ui';
import { cs } from '../i18n/cs';
import { profilePath, useUser } from '../lib/auth';
import { displayName } from '../lib/cards';
import { moveItem, normalizeDeckBack, orderedDeckCards } from '../lib/decks';
import { useLikes } from '../lib/likes';
import { decks, isNotFound, type DeckRecord } from '../lib/pb';
import { NotFound } from './NotFound';
import { EDGES, PALETTES } from './workshop/constants';
import styles from './Deck.module.css';

const t = cs.deck;
const EXPAND = 'owner,cards,cards.owner';

function EditDeck({ deck, onClose, onSaved, onDeleted }: { deck: DeckRecord; onClose: () => void; onSaved: (deck: DeckRecord) => void; onDeleted: () => void }) {
  const [name, setName] = useState(deck.name);
  const [description, setDescription] = useState(deck.description);
  const [visibility, setVisibility] = useState<Visibility>(deck.visibility);
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFailed(false);
    try {
      onSaved(await decks().update(deck.id, { name, description, visibility }, { expand: EXPAND }));
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await decks().delete(deck.id);
      onDeleted();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  if (confirming) {
    return (
      <Dialog open title={t.deleteTitle} onClose={onClose}>
        <p>{t.deleteText}</p>
        {failed && (
          <p className={ui.alert} role="alert">
            {t.saveFailed}
          </p>
        )}
        <div className={ui.dialogActions}>
          <button type="button" className={ui.outline} onClick={() => setConfirming(false)}>
            {cs.common.cancel}
          </button>
          <button type="button" className={ui.primary} disabled={busy} onClick={() => void remove()}>
            {t.deleteConfirm}
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open title={t.editTitle} onClose={onClose}>
      <form className={styles.form} onSubmit={(e) => void submit(e)}>
        <Field label={t.name} required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        <TextAreaField label={t.description} rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        <fieldset className={styles.fieldset}>
          <legend className={ui.smallHeading}>{t.visibility}</legend>
          {(['private', 'unlisted', 'public'] as const).map((value) => (
            <label key={value} className={styles.radio}>
              <input type="radio" name="deck-visibility" checked={visibility === value} onChange={() => setVisibility(value)} />
              {t.visibilityOptions[value]}
            </label>
          ))}
        </fieldset>
        {failed && (
          <p className={ui.alert} role="alert">
            {t.saveFailed}
          </p>
        )}
        <div className={styles.formActions}>
          <button type="button" className={ui.ghost} onClick={() => setConfirming(true)}>
            <Icon name="trash" size={18} />
            {t.deleteDeck}
          </button>
          <span className={styles.spacer} />
          <button type="button" className={ui.outline} onClick={onClose}>
            {cs.common.cancel}
          </button>
          <button type="submit" className={ui.primary} disabled={busy}>
            {busy ? cs.common.saving : cs.common.save}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function BackEditor({ palette, edge, onChange }: { palette: Palette; edge: Edge; onChange: (patch: { palette?: Palette; edge?: Edge }) => void }) {
  return (
    <section className={styles.backEditor} aria-labelledby="balicek-rub">
      <div className={styles.backPreview}>
        <Card3D variant="tarot" flip backPalette={palette} edge={edge} interactive="tilt" />
      </div>
      <div className={styles.backOptions}>
        <h2 id="balicek-rub" className={styles.backTitle}>
          {t.backTitle}
        </h2>
        <p className={ui.hint}>{t.backHint}</p>
        <div className={styles.backGroup}>
          <h3 className={ui.smallHeading}>{t.palette}</h3>
          <div className={styles.options}>
            {PALETTES.map((option) => (
              <button key={option.id} type="button" className={styles.option} aria-pressed={palette === option.id} onClick={() => onChange({ palette: option.id })}>
                <span aria-hidden="true" className={styles.swatchRound} style={{ background: option.base }}>
                  <span className={styles.swatchDot} style={{ background: option.gold }} />
                </span>
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.backGroup}>
          <h3 className={ui.smallHeading}>{t.edge}</h3>
          <div className={styles.options}>
            {EDGES.map((option) => (
              <button key={option.id} type="button" className={styles.option} aria-pressed={edge === option.id} onClick={() => onChange({ edge: option.id })}>
                <span aria-hidden="true" className={styles.swatchEdge} style={{ background: option.swatch ?? 'var(--raised)' }} />
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Deck() {
  const { id = '' } = useParams();
  const user = useUser();
  const navigate = useNavigate();
  const [deck, setDeck] = useState<DeckRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [showBacks, setShowBacks] = useState(false);
  const [editing, setEditing] = useState(false);

  const userId = user?.id;
  useEffect(() => {
    let active = true;
    setDeck(null);
    setMissing(false);
    setFailed(false);
    decks()
      .getOne(id, { expand: EXPAND })
      .then((record) => {
        if (active) setDeck(record);
      })
      .catch((error) => {
        if (!active) return;
        if (isNotFound(error)) setMissing(true);
        else setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [id, userId]);

  const deckRef = useRef(deck);
  deckRef.current = deck;

  const cardsInOrder = useMemo(() => (deck ? orderedDeckCards(deck) : []), [deck]);
  const ids = useMemo(() => cardsInOrder.map((card) => card.id), [cardsInOrder]);
  const { liked, toggle } = useLikes(ids);

  const update = useCallback(
    async (patch: Record<string, unknown>, optimistic: Partial<DeckRecord>) => {
      setSaveFailed(false);
      const previous = deckRef.current;
      setDeck((current) => (current ? { ...current, ...optimistic } : current));
      try {
        setDeck(await decks().update(id, patch, { expand: EXPAND }));
      } catch {
        setSaveFailed(true);
        setDeck(previous);
      }
    },
    [id],
  );

  if (missing) return <NotFound />;
  if (failed) {
    return (
      <main className={styles.main}>
        <p role="alert">{cs.common.somethingWrong}</p>
      </main>
    );
  }
  if (!deck) {
    return (
      <main>
        <p className={ui.spinnerRow}>{cs.common.loading}</p>
      </main>
    );
  }

  const own = user?.id === deck.owner;
  const owner = deck.expand?.owner;
  const back = normalizeDeckBack(deck.back);
  const hidden = deck.cards.length - cardsInOrder.length;
  // The back of a deck is one for all of its cards, so their own backs give way to it.
  const overrides: CardParams = { backPalette: back.palette, edge: back.edge, backPattern: 'mandala', uniformBack: true };

  const changeBack = (patch: { palette?: Palette; edge?: Edge }) => {
    const next = { ...back, ...patch };
    void update({ back: next }, { back: next });
  };

  const reorder = (index: number, delta: number) => {
    // Hidden cards keep their place, so the move works on the full list of ids.
    const card = cardsInOrder[index];
    const neighbour = cardsInOrder[index + delta];
    if (!card || !neighbour) return;
    const from = deck.cards.indexOf(card.id);
    const next = moveItem(deck.cards, from, deck.cards.indexOf(neighbour.id) - from);
    void update({ cards: next }, { cards: next });
  };

  const removeCard = (cardId: string) => {
    const next = deck.cards.filter((item) => item !== cardId);
    void update({ cards: next }, { cards: next });
  };

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <div className={styles.titles}>
          <p className={ui.eyebrow}>{t.eyebrow}</p>
          <h1 className={styles.title}>{deck.name}</h1>
          {deck.description && <p className={styles.description}>{deck.description}</p>}
          <p className={styles.meta}>
            {owner && (
              <>
                {cs.detail.byAuthor}
                <Link to={profilePath(owner.handle)}>{displayName(owner)}</Link>
                {' · '}
              </>
            )}
            {cs.profile.cardsCount(deck.cards.length)}
            {own && deck.visibility !== 'public' && <span className={ui.badge}>{cs.visibility[deck.visibility]}</span>}
          </p>
        </div>
        <div className={styles.headActions}>
          <div className={`${ui.segmented} ${ui.segmentedInset}`} role="group" aria-label={t.show}>
            <button type="button" className={ui.segment} aria-pressed={!showBacks} onClick={() => setShowBacks(false)}>
              {t.showFronts}
            </button>
            <button type="button" className={ui.segment} aria-pressed={showBacks} onClick={() => setShowBacks(true)}>
              {t.showBacks}
            </button>
          </div>
          {own && (
            <button type="button" className={ui.outline} onClick={() => setEditing(true)}>
              <Icon name="pencil" size={18} />
              {t.edit}
            </button>
          )}
        </div>
      </header>

      {saveFailed && (
        <p className={ui.alert} role="alert">
          {t.saveFailed}
        </p>
      )}

      {own && <BackEditor palette={back.palette} edge={back.edge} onChange={changeBack} />}

      {cardsInOrder.length > 0 ? (
        <div className={tileStyles.grid}>
          {cardsInOrder.map((record, index) => (
            <div key={record.id} className={styles.item}>
              <CardTile record={record} liked={Boolean(liked[record.id])} onToggleLike={toggle} showVisibility={own} flip={showBacks} overrides={overrides} />
              {own && (
                <div className={styles.itemActions}>
                  <button type="button" className={ui.iconButton} aria-label={t.moveEarlier + record.title} disabled={index === 0} onClick={() => reorder(index, -1)}>
                    <Icon name="back" size={18} />
                  </button>
                  <button
                    type="button"
                    className={ui.iconButton}
                    aria-label={t.moveLater + record.title}
                    disabled={index === cardsInOrder.length - 1}
                    onClick={() => reorder(index, 1)}
                  >
                    <Icon name="back" size={18} style={{ transform: 'rotate(180deg)' }} />
                  </button>
                  <button type="button" className={ui.iconButton} aria-label={t.remove + record.title} onClick={() => removeCard(record.id)}>
                    <Icon name="trash" size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{t.empty}</p>
      )}
      {hidden > 0 && <p className={styles.empty}>{t.hiddenCards(hidden)}</p>}

      {editing && (
        <EditDeck
          deck={deck}
          onClose={() => setEditing(false)}
          onSaved={(saved) => {
            setDeck(saved);
            setEditing(false);
          }}
          onDeleted={() => navigate(owner ? profilePath(owner.handle) : '/', { replace: true })}
        />
      )}
    </main>
  );
}
