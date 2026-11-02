import type { CardDoc } from '../../card/spec';
import { cs } from '../../i18n/cs';
import { useWorkshop } from './context';
import type { SaveState } from './useAutosave';
import styles from './shared.module.css';

const w = cs.workshop;

export function kindLine(doc: CardDoc): string {
  const line = w.kindLine;
  switch (doc.family) {
    case 'tarot':
      return doc.meaning.arcana === 'velka' ? line.tarotVelka : line.tarotMala;
    case 'orakulum':
      return line.orakulum;
    case 'bestie':
      return line.bestie + cs.card.elements[doc.look.element];
    case 'hrdina':
      return line.hrdina + doc.content.cls;
    case 'prazdna':
      return line.prazdna;
  }
}

const SAVE_LABEL: Record<SaveState, string> = {
  saved: w.saved,
  saving: w.saving,
  offline: w.offline,
  error: w.saveError,
};

/** „Ukládám…“, „Uloženo“, „Offline“. The plain form sits on the second line of the phone header. */
export function SaveBadge({ plain = false }: { plain?: boolean }) {
  const { saveState } = useWorkshop();
  return (
    <span role="status" className={plain ? styles.statusPlain : styles.status} data-state={saveState} title={saveState === 'error' ? w.saveErrorHint : undefined}>
      <span aria-hidden="true" className={plain ? styles.dotPlain : styles.dot} />
      {SAVE_LABEL[saveState]}
    </span>
  );
}

/** The front and back switch. The phone and the desktop only differ in its surroundings. */
export function CardControls({ className }: { className?: string }) {
  const { flip, setFlip } = useWorkshop();
  return (
    <div className={`${styles.sides} ${className ?? ''}`}>
      <button type="button" className={styles.side} aria-pressed={!flip} onClick={() => setFlip(false)}>
        {w.front}
      </button>
      <button type="button" className={styles.side} aria-pressed={flip} onClick={() => setFlip(true)}>
        {w.back}
      </button>
    </div>
  );
}
