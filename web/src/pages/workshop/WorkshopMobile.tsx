import { Link } from 'react-router-dom';
import { Card3D } from '../../card/Card3D';
import { Icon } from '../../components/Icon';
import { cs } from '../../i18n/cs';
import { useWorkshop } from './context';
import { SettingsPanel } from './panels';
import { CardControls, SaveBadge } from './shared';
import styles from './WorkshopMobile.module.css';

const w = cs.workshop;

/** The card takes about the same share of the screen as in the 390 × 844 design. */
function cardWidth(family: string, formatW: number, formatH: number): string {
  if (family === 'bestie' || family === 'hrdina') return 'min(214px, 25.3dvh, 70vw)';
  if (family === 'prazdna') return `min(214px, calc(36.5dvh * ${formatW} / ${formatH}), 70vw)`;
  return 'min(180px, 21.3dvh, 60vw)';
}

export function WorkshopMobile() {
  const { doc, params, record, isOwner, flip, spin, toggleSpin, resetKey, light, publishing, publish, openShare, canUndo, canRedo, undo, redo, others } = useWorkshop();
  const [first] = others;

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Link to="/" aria-label={w.backToGalleryLabel} className={styles.back}>
          <Icon name="back" size={22} strokeWidth={1.8} />
        </Link>
        <div className={styles.titles}>
          <span className={styles.title}>{doc.title || cs.card.defaults.titleBlank}</span>
          <span className={styles.statusLine}>
            <SaveBadge plain />
            {first && <span className={styles.others}>· {w.alsoEditing(first.handle, others.length - 1)}</span>}
          </span>
        </div>
        <button type="button" className={styles.iconButton} aria-label={w.share} onClick={openShare}>
          <Icon name="share" />
        </button>
        {isOwner && record.visibility !== 'public' && (
          <button type="button" className={styles.publish} disabled={publishing} onClick={publish}>
            {publishing ? w.publishing : w.publish}
          </button>
        )}
      </header>

      <div className={styles.cardArea}>
        <div style={{ width: cardWidth(doc.family, doc.formatW, doc.formatH) }}>
          <Card3D {...params} light={light} flip={flip} spin={spin} resetKey={resetKey} interactive="drag" />
        </div>
        <div className={styles.controls}>
          <button type="button" className={styles.round} aria-label={w.undo} disabled={!canUndo} onClick={undo}>
            <Icon name="undo" />
          </button>
          <CardControls className={styles.sides} />
          <button type="button" className={styles.round} aria-pressed={spin} aria-label={w.spinLabel} onClick={toggleSpin}>
            <Icon name="rotate" />
          </button>
          <button type="button" className={styles.round} aria-label={w.redo} disabled={!canRedo} onClick={redo}>
            <Icon name="redo" />
          </button>
        </div>
      </div>

      <section aria-label={w.settingsLabel} className={styles.sheet}>
        <div aria-hidden="true" className={styles.handle} />
        <SettingsPanel />
      </section>
    </div>
  );
}
