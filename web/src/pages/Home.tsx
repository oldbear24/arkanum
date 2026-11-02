import { useCallback, useMemo, type CSSProperties } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card3D } from '../card/Card3D';
import type { CardParams } from '../card/resolve';
import tileStyles from '../components/CardTile.module.css';
import { CardTile } from '../components/CardTile';
import { Icon, type IconName } from '../components/Icon';
import { ui } from '../components/ui';
import { cs } from '../i18n/cs';
import { fetchGalleryPage, type GalleryFilter, type GallerySort } from '../lib/cards';
import { useLikes } from '../lib/likes';
import { usePagedCards } from '../lib/usePagedCards';
import styles from './Home.module.css';

const FEATURE_ICONS: IconName[] = ['cube', 'cards', 'sync'];

const ASTRO_TICKS = (() => {
  let d = '';
  for (let i = 0; i < 72; i++) {
    const a = (i * 5 * Math.PI) / 180;
    const r2 = i % 6 === 0 ? 264 : 254;
    d += 'M' + (300 + 246 * Math.cos(a)).toFixed(1) + ' ' + (300 + 246 * Math.sin(a)).toFixed(1) + 'L' + (300 + r2 * Math.cos(a)).toFixed(1) + ' ' + (300 + r2 * Math.sin(a)).toFixed(1);
  }
  return d;
})();

function Astrolabe() {
  const gold = { fill: 'none', stroke: '#d6b067', strokeWidth: 1 };
  return (
    <svg viewBox="0 0 600 600" aria-hidden="true" className={styles.astro}>
      <circle cx="300" cy="300" r="290" {...gold} strokeOpacity="0.35" />
      <circle cx="300" cy="300" r="246" {...gold} strokeOpacity="0.5" />
      <circle cx="300" cy="300" r="200" {...gold} strokeOpacity="0.25" />
      <circle cx="300" cy="300" r="120" {...gold} strokeOpacity="0.2" strokeDasharray="2 6" />
      <path d={ASTRO_TICKS} {...gold} strokeOpacity="0.55" />
      <path d="M300 10V590M10 300H590M95 95L505 505M505 95L95 505" {...gold} strokeOpacity="0.12" />
    </svg>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-nadpis" className={styles.hero}>
      <div className={styles.heroText}>
        <p className={ui.eyebrow}>{cs.home.eyebrow}</p>
        <h1 id="hero-nadpis" className={styles.heroTitle}>
          {cs.home.title}
        </h1>
        <p className={styles.lead}>{cs.home.lead}</p>
        <div className={styles.heroActions}>
          <Link to="/sablony" className={ui.primaryLarge}>
            {cs.home.start}
            <Icon name="arrowRight" size={18} strokeWidth={2} />
          </Link>
          <a href="#galerie" className={ui.outlineLarge}>
            {cs.home.browse}
          </a>
        </div>
        <ul className={styles.features}>
          {cs.home.features.map((feature, i) => (
            <li key={feature.title} className={styles.feature}>
              <span className={styles.featureIcon}>
                <Icon name={FEATURE_ICONS[i]} strokeWidth={1.6} />
              </span>
              <span className={styles.featureText}>
                <strong>{feature.title}</strong>
                <span>{feature.text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className={styles.fan}>
        <Astrolabe />
        <div className={`${styles.fanCard} ${styles.fanLeft}`}>
          <Card3D variant="tarot" art="mag" palette="krev" frame="gotika" foil="zlata" />
        </div>
        <div className={`${styles.fanCard} ${styles.fanRight}`}>
          <Card3D variant="tarot" art="mesic" palette="smaragd" frame="deco" foil="kosmos" />
        </div>
        <div className={`${styles.fanCard} ${styles.fanCenter}`}>
          <Card3D variant="tarot" art="hvezda" palette="pulnoc" frame="secese" foil="duha" foilI={80} />
        </div>
        <p className={styles.fanHint}>{cs.home.heroHint}</p>
      </div>
    </section>
  );
}

const TEMPLATE_STRIP: { key: keyof typeof cs.home.templates; width: string; card: CardParams }[] = [
  { key: 'tarot', width: '118px', card: { variant: 'tarot', art: 'slunce', palette: 'pulnoc', frame: 'secese', foil: 'zlata' } },
  { key: 'bestie', width: '146px', card: { variant: 'bestie', element: 'stin', foil: 'duha' } },
  { key: 'hrdina', width: '146px', card: { variant: 'hrdina', foil: 'zlata' } },
  { key: 'orakulum', width: '118px', card: { variant: 'orakulum', palette: 'pergamen', frame: 'minimal', foil: 'zadna' } },
];

function TemplateStrip() {
  return (
    <section aria-labelledby="sablony-nadpis" className={styles.section}>
      <div className={styles.sectionHead}>
        <div className={styles.sectionTitles}>
          <p className={ui.eyebrow}>{cs.home.templatesEyebrow}</p>
          <h2 id="sablony-nadpis" className={styles.sectionTitle}>
            {cs.home.templatesTitle}
          </h2>
        </div>
        <Link to="/sablony" className={ui.ghost}>
          {cs.home.allTemplates}
          <Icon name="arrowRight" size={18} strokeWidth={2} />
        </Link>
      </div>
      <div className={styles.templates}>
        {TEMPLATE_STRIP.map(({ key, width, card }) => (
          <article key={key} className={styles.template}>
            <div className={styles.templateStage}>
              <div style={{ width } as CSSProperties}>
                <Card3D {...card} />
              </div>
            </div>
            <div className={styles.templateInfo}>
              <div className={styles.templateRow}>
                <h3 className={styles.templateName}>{cs.family[key]}</h3>
                <span className={styles.templateFormat}>{cs.home.templates[key].format}</span>
              </div>
              <p className={styles.templateDesc}>{cs.home.templates[key].desc}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

const FILTERS: { key: GalleryFilter; label: string }[] = [
  { key: 'vse', label: cs.gallery.filterAll },
  { key: 'tarot', label: cs.gallery.filterTarot },
  { key: 'bestie', label: cs.gallery.filterBestie },
  { key: 'hrdina', label: cs.gallery.filterHrdina },
  { key: 'orakulum', label: cs.gallery.filterOrakulum },
];

const SORTS: { key: GallerySort; label: string }[] = [
  { key: 'nove', label: cs.gallery.sortNewest },
  { key: 'oblibene', label: cs.gallery.sortPopular },
];

function Gallery() {
  const [params, setParams] = useSearchParams();
  const rawFilter = params.get('druh');
  const filter: GalleryFilter = FILTERS.some((f) => f.key === rawFilter) ? (rawFilter as GalleryFilter) : 'vse';
  const sort: GallerySort = params.get('razeni') === 'oblibene' ? 'oblibene' : 'nove';
  const query = params.get('q') ?? '';

  const update = (key: string, value: string | null) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  };

  const load = useCallback((page: number) => fetchGalleryPage(filter, sort, query, page), [filter, sort, query]);
  const { items, loading, failed, hasMore, setSentinel, retry } = usePagedCards(load, `${filter}|${sort}|${query}`);

  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const { liked, toggle } = useLikes(ids);

  return (
    <section id="galerie" aria-labelledby="galerie-nadpis" className={styles.section}>
      <div className={styles.sectionHead}>
        <div className={styles.sectionTitles}>
          <p className={ui.eyebrow}>{cs.home.galleryEyebrow}</p>
          <h2 id="galerie-nadpis" className={styles.sectionTitle}>
            {cs.home.galleryTitle}
          </h2>
        </div>
        <div className={ui.segmented} role="group" aria-label={cs.gallery.sortLabel}>
          {SORTS.map((option) => (
            <button
              key={option.key}
              type="button"
              className={ui.segment}
              aria-pressed={sort === option.key}
              onClick={() => update('razeni', option.key === 'nove' ? null : option.key)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.chips} role="group" aria-label={cs.gallery.filterLabel}>
        {FILTERS.map((option) => (
          <button
            key={option.key}
            type="button"
            className={ui.chip}
            aria-pressed={filter === option.key}
            onClick={() => update('druh', option.key === 'vse' ? null : option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {query && (
        <p className={styles.searchNote}>
          {cs.gallery.searchFor}
          <strong>{query}</strong>{' '}
          <Link to="/#galerie" className={ui.ghost}>
            {cs.gallery.clearSearch}
          </Link>
        </p>
      )}

      {items.length > 0 && (
        <div className={tileStyles.grid}>
          {items.map((record) => (
            <CardTile key={record.id} record={record} liked={Boolean(liked[record.id])} onToggleLike={toggle} />
          ))}
        </div>
      )}

      {!loading && !failed && items.length === 0 && <p className={styles.empty}>{query ? cs.gallery.emptySearch : cs.gallery.empty}</p>}

      {failed && (
        <div className={styles.empty} role="alert">
          <p>{cs.gallery.loadError}</p>
          <button type="button" className={ui.outline} onClick={() => void retry()}>
            {cs.common.retry}
          </button>
        </div>
      )}

      {loading && <p className={ui.spinnerRow}>{items.length ? cs.gallery.loadingMore : cs.common.loading}</p>}
      {hasMore && <div ref={setSentinel} aria-hidden="true" />}
    </section>
  );
}

export function Home() {
  return (
    <main className={styles.main}>
      <Hero />
      <TemplateStrip />
      <Gallery />
    </main>
  );
}
