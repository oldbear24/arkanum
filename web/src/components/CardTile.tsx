import { memo, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LazyCard } from '../card/LazyCard';
import type { CardParams } from '../card/resolve';
import { cs } from '../i18n/cs';
import { authorOf, recordToParams, thumbnailUrl } from '../lib/cards';
import type { CardRecord } from '../lib/pb';
import styles from './CardTile.module.css';
import { Icon } from './Icon';
import { ui } from './ui';

interface CardTileProps {
  record: CardRecord;
  liked?: boolean;
  onToggleLike?: (cardId: string) => void;
  /** Shows a badge on cards that are not public. */
  showVisibility?: boolean;
  flip?: boolean;
  /** Parameters that replace those of the card, a deck uses it for its shared back. */
  overrides?: CardParams;
}

export const CardTile = memo(function CardTile({ record, liked = false, onToggleLike, showVisibility, flip, overrides }: CardTileProps) {
  const params = useMemo(() => ({ ...recordToParams(record), ...overrides }), [record, overrides]);
  const href = `/karta/${record.id}`;
  const title = record.title || cs.card.defaults.titleBlank;
  const author = authorOf(record);

  return (
    <article className={styles.tile}>
      <div className={styles.cardBox}>
        <Link to={href} className={styles.cardLink}>
          <LazyCard {...params} flip={flip} thumbnail={flip ? undefined : thumbnailUrl(record)} />
        </Link>
      </div>
      <div className={styles.meta}>
        <div className={styles.text}>
          <h3 className={styles.title}>
            <Link to={href}>{title}</Link>
          </h3>
          <p className={styles.sub}>
            {author ? `${author} · ` : ''}
            {cs.gallery.kind[record.family]}
          </p>
          {showVisibility && record.visibility !== 'public' && <span className={ui.badge}>{cs.visibility[record.visibility]}</span>}
        </div>
        {onToggleLike && (
          <button
            type="button"
            className={styles.like}
            aria-pressed={liked}
            aria-label={(liked ? cs.gallery.likeRemove : cs.gallery.likeAdd) + title}
            onClick={() => onToggleLike(record.id)}
          >
            <Icon name="heart" fill={liked ? 'var(--gold)' : 'none'} />
          </button>
        )}
      </div>
    </article>
  );
});
