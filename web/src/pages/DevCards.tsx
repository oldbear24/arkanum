import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card3D } from '../card/Card3D';
import { CardBack } from '../card/CardBack';
import { CardFace } from '../card/CardFace';
import { LazyCard } from '../card/LazyCard';
import type { CardParams } from '../card/resolve';
import { enums, ranges, type Interactive } from '../card/spec';
import styles from './DevCards.module.css';

// Developer page for checking the card against design/Karta.dc.html. It is not linked
// from the app, and its labels are the raw parameter names on purpose.

type EnumKey = 'variant' | 'art' | 'frame' | 'palette' | 'element' | 'foil' | 'surface' | 'edge' | 'font';
const ENUM_CONTROLS: EnumKey[] = ['variant', 'art', 'frame', 'palette', 'element', 'foil', 'surface', 'edge', 'font'];

const RANGE_CONTROLS: { key: 'foilI' | 'thick' | 'radius' | 'depth' | 'light'; min: number; max: number; step: number }[] = [
  { key: 'foilI', min: ranges.foilI[0], max: ranges.foilI[1], step: 1 },
  { key: 'thick', min: ranges.thick[0], max: ranges.thick[1], step: 0.5 },
  { key: 'radius', min: ranges.radius[0], max: ranges.radius[1], step: 1 },
  { key: 'depth', min: ranges.depth[0], max: ranges.depth[1], step: 1 },
  { key: 'light', min: 0, max: 100, step: 1 },
];

const TEXT_CONTROLS = ['cardTitle', 'numeral', 'subtitle', 'cls', 'ab1', 'ab1t', 'ab2', 'ab2t', 'author', 'setNo'] as const;
const NUMBER_CONTROLS = ['hp', 'level', 'cost', 's1', 's2', 's3', 'rarity', 'ab1p', 'ab2p'] as const;
const FLAG_CONTROLS = ['emboss', 'showArt', 'showFrame', 'showText', 'showFoil', 'shadow'] as const;
const INTERACTIVE: Interactive[] = ['tilt', 'drag', 'none'];

const MATRIX: CardParams[] = [
  ...enums.art.flatMap((art) => enums.frame.map((frame): CardParams => ({ variant: 'tarot', art, frame, palette: 'pulnoc' }))),
  ...enums.palette.map((palette): CardParams => ({ variant: 'tarot', art: 'slunce', palette, frame: 'deco', foil: 'duha' })),
  ...enums.palette.map((palette): CardParams => ({ variant: 'orakulum', palette, foil: 'zlata' })),
  ...enums.element.map((element): CardParams => ({ variant: 'bestie', element, foil: 'kosmos', rarity: 4 })),
  ...enums.foil.map((foil): CardParams => ({ variant: 'hrdina', foil })),
  { variant: 'prazdna', formatW: 70, formatH: 120, cardTitle: 'Tarot' },
  { variant: 'prazdna', formatW: 63, formatH: 88, cardTitle: 'Sběratelská' },
  { variant: 'prazdna', formatW: 44, formatH: 68, cardTitle: 'Mini' },
  { variant: 'prazdna', formatW: 70, formatH: 70, cardTitle: 'Čtvercová', subtitle: 'Sejdeme se o slunovratu.' },
  { variant: 'prazdna', formatW: 120, formatH: 70, cardTitle: 'Na šířku', palette: 'krev', edge: 'zlata' },
];

function parseSolo(search: URLSearchParams): CardParams & { flip?: boolean } {
  const result: Record<string, unknown> = {};
  search.forEach((value, key) => {
    if (key === 'solo') return;
    if (value === 'true' || value === 'false') result[key] = value === 'true';
    else if (value !== '' && !Number.isNaN(Number(value))) result[key] = Number(value);
    else result[key] = value;
  });
  return result;
}

/** One card alone with the padding of the prototype, for screenshot comparisons. */
function SoloCard({ search }: { search: URLSearchParams }) {
  const params = parseSolo(search);
  return (
    <div style={{ boxSizing: 'border-box', width: 356, padding: 28 }}>
      <Card3D {...params} />
    </div>
  );
}

export function DevCards() {
  const [search] = useSearchParams();
  return search.has('solo') ? <SoloCard search={search} /> : <CardLab />;
}

function CardLab() {
  const [params, setParams] = useState<CardParams>({ variant: 'tarot', foil: 'duha', foilI: 80, depth: 60 });
  const [interactive, setInteractive] = useState<Interactive>('drag');
  const [flip, setFlip] = useState(false);
  const [spin, setSpin] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const set = (patch: CardParams) => setParams((current) => ({ ...current, ...patch }));
  const json = useMemo(() => JSON.stringify({ ...params, flip, spin, interactive }, null, 2), [params, flip, spin, interactive]);

  return (
    <main className={styles.page}>
      <h1 className={styles.title}>/dev/karty</h1>

      <section className={styles.lab} aria-label="Laboratoř karty">
        <div className={styles.controls}>
          {ENUM_CONTROLS.map((key) => (
            <label key={key} className={styles.control}>
              <span>{key}</span>
              <select value={String(params[key] ?? '')} onChange={(e) => set({ [key]: e.target.value || undefined })}>
                <option value="">(výchozí)</option>
                {enums[key].map((value: string) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          ))}

          {RANGE_CONTROLS.map(({ key, min, max, step }) => (
            <label key={key} className={styles.control}>
              <span>
                {key} {params[key] ?? '–'}
              </span>
              <input type="range" min={min} max={max} step={step} value={params[key] ?? min} onChange={(e) => set({ [key]: Number(e.target.value) })} />
            </label>
          ))}

          {TEXT_CONTROLS.map((key) => (
            <label key={key} className={styles.control}>
              <span>{key}</span>
              <input type="text" value={params[key] ?? ''} onChange={(e) => set({ [key]: e.target.value })} />
            </label>
          ))}

          {NUMBER_CONTROLS.map((key) => (
            <label key={key} className={styles.control}>
              <span>{key}</span>
              <input type="number" value={params[key] ?? ''} onChange={(e) => set({ [key]: e.target.value === '' ? undefined : Number(e.target.value) })} />
            </label>
          ))}

          {FLAG_CONTROLS.map((key) => (
            <label key={key} className={styles.flag}>
              <input type="checkbox" checked={params[key] ?? true} onChange={(e) => set({ [key]: e.target.checked })} />
              <span>{key}</span>
            </label>
          ))}

          <label className={styles.control}>
            <span>interactive</span>
            <select value={interactive} onChange={(e) => setInteractive(e.target.value as Interactive)}>
              {INTERACTIVE.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className={styles.flag}>
            <input type="checkbox" checked={flip} onChange={(e) => setFlip(e.target.checked)} />
            <span>flip</span>
          </label>
          <label className={styles.flag}>
            <input type="checkbox" checked={spin} onChange={(e) => setSpin(e.target.checked)} />
            <span>spin</span>
          </label>
          <button type="button" className={styles.button} onClick={() => setResetKey((k) => k + 1)}>
            resetKey ({resetKey})
          </button>
          <button type="button" className={styles.button} onClick={() => setParams({})}>
            Vymazat parametry
          </button>
        </div>

        <div className={styles.stage}>
          <Card3D {...params} interactive={interactive} flip={flip} spin={spin} resetKey={resetKey} />
        </div>

        <div className={styles.flat}>
          <figure>
            <CardFace {...params} />
            <figcaption>CardFace</figcaption>
          </figure>
          <figure>
            <CardBack {...params} />
            <figcaption>CardBack</figcaption>
          </figure>
          <pre className={styles.json}>{json}</pre>
        </div>
      </section>

      <section aria-label="Přehled variant">
        <h2 className={styles.subtitle}>Přehled variant</h2>
        <div className={styles.matrix}>
          {MATRIX.map((card, i) => (
            <figure key={i} className={styles.cell}>
              <LazyCard {...card} />
              <figcaption>{Object.values(card).join(' · ')}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
