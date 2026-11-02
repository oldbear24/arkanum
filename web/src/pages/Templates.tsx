import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card3D } from '../card/Card3D';
import type { CardParams } from '../card/resolve';
import type { Family } from '../card/spec';
import { Icon } from '../components/Icon';
import { Field, ui } from '../components/ui';
import { cs } from '../i18n/cs';
import { signInPath, useUser } from '../lib/auth';
import { createCardFromTemplate, fetchTemplate } from '../lib/cards';
import { FORMATS, resolveFormat, type FormatKey, type Orientation } from '../lib/format';
import styles from './Templates.module.css';

type Category = 'vse' | 'vestecke' | 'herni';
type FamilyKey = keyof typeof cs.templates.families;

interface FanCard extends CardParams {
  w: string;
  dx: string;
  dy: string;
  rot: number;
  z: number;
  flip?: boolean;
}

const FAMILIES: { id: FamilyKey; cat: Category; cards: FanCard[] }[] = [
  {
    id: 'tarot',
    cat: 'vestecke',
    cards: [
      { variant: 'tarot', art: 'mag', palette: 'krev', frame: 'gotika', foil: 'zlata', w: '126px', dx: '-66%', dy: '5%', rot: -12, z: 1 },
      { variant: 'tarot', art: 'mesic', palette: 'smaragd', frame: 'deco', foil: 'kosmos', w: '126px', dx: '66%', dy: '5%', rot: 12, z: 1 },
      { variant: 'tarot', art: 'hvezda', palette: 'pulnoc', frame: 'secese', foil: 'duha', w: '144px', dx: '0%', dy: '0%', rot: 0, z: 2 },
    ],
  },
  {
    id: 'bestie',
    cat: 'herni',
    cards: [
      { variant: 'bestie', element: 'mlha', foil: 'kosmos', flip: true, w: '168px', dx: '30%', dy: '3%', rot: 9, z: 1 },
      { variant: 'bestie', element: 'ohen', foil: 'duha', cardTitle: cs.templates.fanTitles.bestie.title, subtitle: cs.templates.fanTitles.bestie.subtitle, w: '174px', dx: '-26%', dy: '0%', rot: -5, z: 2 },
    ],
  },
  {
    id: 'hrdina',
    cat: 'herni',
    cards: [
      { variant: 'hrdina', foil: 'zlata', flip: true, w: '168px', dx: '30%', dy: '3%', rot: 9, z: 1 },
      { variant: 'hrdina', foil: 'duha', w: '174px', dx: '-26%', dy: '0%', rot: -5, z: 2 },
    ],
  },
  {
    id: 'orakulum',
    cat: 'vestecke',
    cards: [
      { variant: 'orakulum', palette: 'pulnoc', frame: 'secese', foil: 'zlata', cardTitle: cs.templates.fanTitles.orakulum.title, subtitle: cs.templates.fanTitles.orakulum.subtitle, w: '134px', dx: '34%', dy: '3%', rot: 9, z: 1 },
      { variant: 'orakulum', palette: 'pergamen', frame: 'minimal', foil: 'zadna', w: '142px', dx: '-30%', dy: '0%', rot: -5, z: 2 },
    ],
  },
];

const CATEGORIES: { key: Category; label: string }[] = [
  { key: 'vse', label: cs.templates.catAll },
  { key: 'vestecke', label: cs.templates.catOracle },
  { key: 'herni', label: cs.templates.catGame },
];

function simplify(text: string): string {
  return text
    .toLocaleLowerCase('cs')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Creates a card and opens it in the workshop. A guest signs in first and comes back here. */
function useCreateCard() {
  const user = useUser();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const create = async (key: string, family: Family, format?: { w: number; h: number }) => {
    if (!user) {
      navigate(signInPath('/sablony'));
      return;
    }
    setBusy(key);
    setError(null);
    try {
      const template = await fetchTemplate(family);
      const card = await createCardFromTemplate({ owner: user.id, template, format });
      navigate(`/dilna/${card.id}`);
    } catch {
      setError(key);
      setBusy(null);
    }
  };

  return { busy, error, create };
}

function FamilyCard({ id, cards, busy, failed, onUse }: { id: FamilyKey; cards: FanCard[]; busy: boolean; failed: boolean; onUse: () => void }) {
  const text = cs.templates.families[id];
  return (
    <article className={styles.family}>
      <div className={styles.stage}>
        {cards.map(({ w, dx, dy, rot, z, ...card }, i) => (
          <div
            key={i}
            className={styles.stageCard}
            style={{ width: w, zIndex: z, transform: `translate(-50%, -50%) translateX(${dx}) translateY(${dy}) rotate(${rot}deg)` }}
          >
            <Card3D {...card} />
          </div>
        ))}
      </div>
      <div className={styles.familyInfo}>
        <div className={styles.familyHead}>
          <h2 className={styles.familyName}>{text.name}</h2>
          <span className={styles.familyFormat}>{text.format}</span>
        </div>
        <p className={styles.familyDesc}>{text.desc}</p>
        <ul className={styles.specs}>
          {text.specs.map((spec) => (
            <li key={spec} className={styles.spec}>
              <Icon name="check" size={18} strokeWidth={2} style={{ flex: '0 0 18px', marginTop: 2, color: 'var(--gold)' }} />
              <span>{spec}</span>
            </li>
          ))}
        </ul>
        <div className={styles.familyActions}>
          <button type="button" className={ui.primaryMedium} disabled={busy} onClick={onUse}>
            {busy ? cs.templates.creating : cs.templates.use}
          </button>
          {failed && (
            <span className={ui.error} role="alert">
              {cs.templates.createError}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function BlankCardForm({ busy, failed, onCreate }: { busy: boolean; failed: boolean; onCreate: (format: { w: number; h: number }) => void }) {
  const [format, setFormat] = useState<FormatKey>('tarot');
  const [orientation, setOrientation] = useState<Orientation>('vyska');
  const [customW, setCustomW] = useState('80');
  const [customH, setCustomH] = useState('125');
  const resolved = resolveFormat(format, orientation, customW, customH);

  return (
    <section aria-labelledby="prazdna-nadpis" className={styles.blankSection}>
      <div className={styles.blank}>
        <div className={styles.blankForm}>
          <div className={styles.blankHead}>
            <h2 id="prazdna-nadpis" className={styles.familyName}>
              {cs.templates.blankTitle}
            </h2>
            <p className={styles.blankLead}>{cs.templates.blankLead}</p>
          </div>

          <div className={styles.blankGroup}>
            <h3 className={ui.smallHeading}>{cs.templates.format}</h3>
            <div className={styles.formats}>
              {FORMATS.map((option) => (
                <button key={option.key} type="button" className={styles.format} aria-pressed={format === option.key} onClick={() => setFormat(option.key)}>
                  <span className={styles.formatName}>{cs.templates.formats[option.key]}</span>
                  <span className={styles.formatSize}>{option.w ? `${option.w} × ${option.h} ${cs.common.mm}` : cs.templates.enterSize}</span>
                </button>
              ))}
            </div>
          </div>

          {resolved.custom && (
            <div className={styles.customSize}>
              <Field label={cs.templates.width} type="number" min={30} max={200} value={customW} onChange={(e) => setCustomW(e.target.value)} />
              <Field label={cs.templates.height} type="number" min={30} max={200} value={customH} onChange={(e) => setCustomH(e.target.value)} />
            </div>
          )}

          <div className={styles.blankGroup}>
            <h3 className={ui.smallHeading}>{cs.templates.orientation}</h3>
            <div className={`${ui.segmented} ${ui.segmentedInset} ${styles.orientation}`}>
              <button type="button" className={ui.segment} aria-pressed={orientation === 'vyska'} onClick={() => setOrientation('vyska')}>
                {cs.templates.portrait}
              </button>
              <button type="button" className={ui.segment} aria-pressed={orientation === 'sirka'} onClick={() => setOrientation('sirka')}>
                {cs.templates.landscape}
              </button>
            </div>
          </div>

          <div className={styles.blankActions}>
            <button type="button" className={ui.primaryMedium} disabled={busy} onClick={() => onCreate({ w: resolved.w, h: resolved.h })}>
              {busy ? cs.templates.creating : cs.templates.createBlank}
            </button>
            {failed && (
              <span className={ui.error} role="alert">
                {cs.templates.createError}
              </span>
            )}
          </div>
        </div>

        <div className={styles.preview}>
          <div className={styles.previewBox} style={{ width: resolved.previewWidth, aspectRatio: resolved.ratio }}>
            <span className={styles.previewLabel}>{resolved.label}</span>
          </div>
          <p className={styles.previewNote}>{cs.templates.ratioPreview}</p>
        </div>
      </div>
    </section>
  );
}

export function Templates() {
  const [params] = useSearchParams();
  const [category, setCategory] = useState<Category>('vse');
  const { busy, error, create } = useCreateCard();

  const query = simplify(params.get('q') ?? '');
  const families = useMemo(
    () =>
      FAMILIES.filter((family) => category === 'vse' || family.cat === category).filter((family) => {
        const text = cs.templates.families[family.id];
        return !query || simplify(`${text.name} ${text.desc}`).includes(query);
      }),
    [category, query],
  );

  return (
    <main>
      <section aria-labelledby="sablony-h1" className={styles.intro}>
        <div className={styles.introText}>
          <p className={ui.eyebrow}>{cs.templates.eyebrow}</p>
          <h1 id="sablony-h1" className={styles.title}>
            {cs.templates.title}
          </h1>
          <p className={styles.lead}>{cs.templates.lead}</p>
        </div>
        <div className={styles.categories}>
          {CATEGORIES.map((option) => (
            <button key={option.key} type="button" className={ui.chip} aria-pressed={category === option.key} onClick={() => setCategory(option.key)}>
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section aria-label={cs.templates.familiesLabel} className={styles.familiesSection}>
        {families.length === 0 && <p className={styles.noMatch}>{cs.templates.noMatch}</p>}
        <div className={styles.families}>
          {families.map((family) => (
            <FamilyCard
              key={family.id}
              id={family.id}
              cards={family.cards}
              busy={busy === family.id}
              failed={error === family.id}
              onUse={() => void create(family.id, family.id)}
            />
          ))}
        </div>
      </section>

      <BlankCardForm busy={busy === 'prazdna'} failed={error === 'prazdna'} onCreate={(format) => void create('prazdna', 'prazdna', format)} />
    </main>
  );
}
