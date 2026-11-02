import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Card3D } from '../card/Card3D';
import { normalizeCard } from '../card/normalize';
import { resolveCard, type ResolvedCard } from '../card/resolve';
import type { CardDoc } from '../card/spec';
import { AddToDeckDialog } from '../components/AddToDeckDialog';
import { Icon } from '../components/Icon';
import { Dialog, ui } from '../components/ui';
import { UnlockSwitch } from '../components/UnlockSwitch';
import { cs } from '../i18n/cs';
import { profilePath, signInPath, useUser } from '../lib/auth';
import { recordToParams, remixCard } from '../lib/cards';
import { useLikes } from '../lib/likes';
import { cards, isNotFound, type CardRecord } from '../lib/pb';
import { NotFound } from './NotFound';
import { kindLine } from './workshop/shared';
import styles from './CardDetail.module.css';

const d = cs.detail;
const w = cs.workshop;

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.stat}>
      <dt className={styles.statLabel}>{label}</dt>
      <dd className={styles.statValue}>{value}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.block}>
      <h2 className={ui.smallHeading}>{title}</h2>
      {children}
    </section>
  );
}

function Prose({ children }: { children: string }) {
  return <p className={styles.prose}>{children}</p>;
}

function Meaning({ doc, card }: { doc: CardDoc; card: ResolvedCard }) {
  const { content, meaning } = doc;
  const abilities = [
    { name: card.ab1, power: card.ab1p, text: card.ab1t },
    { name: card.ab2, power: card.ab2p, text: card.ab2t },
  ];
  const s = w.stats;

  switch (doc.family) {
    case 'tarot': {
      const nothing = !meaning.upright && !meaning.reversed && meaning.keywords.length === 0;
      if (nothing) return <p className={styles.empty}>{d.empty}</p>;
      return (
        <>
          {meaning.upright && (
            <Block title={d.upright}>
              <Prose>{meaning.upright}</Prose>
            </Block>
          )}
          {meaning.reversed && (
            <Block title={d.reversed}>
              <Prose>{meaning.reversed}</Prose>
            </Block>
          )}
          {meaning.keywords.length > 0 && (
            <Block title={d.keywords}>
              <ul className={styles.keywords}>
                {meaning.keywords.map((keyword) => (
                  <li key={keyword} className={styles.keyword}>
                    {keyword}
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </>
      );
    }
    case 'orakulum':
      return (
        <>
          <Block title={d.message}>
            <Prose>{card.subtitle}</Prose>
          </Block>
          {meaning.upright && (
            <Block title={d.reading}>
              <Prose>{meaning.upright}</Prose>
            </Block>
          )}
        </>
      );
    case 'bestie':
      return (
        <>
          <Block title={d.stats}>
            <dl className={styles.stats}>
              <Stat label={s.hp} value={content.hp} />
              <Stat label={s.level} value={content.level} />
              <Stat label={s.attack} value={content.s1} />
              <Stat label={s.defense} value={content.s2} />
              <Stat label={d.rarity} value={`${content.rarity} / 5`} />
              <Stat label={d.element} value={cs.card.elements[doc.look.element]} />
            </dl>
          </Block>
          <Block title={d.abilities}>
            <ul className={styles.abilities}>
              {abilities.map((ability) => (
                <li key={ability.name} className={styles.ability}>
                  <span className={styles.abilityName}>{ability.name}</span>
                  <span className={styles.abilityPower}>
                    {d.power} {ability.power}
                  </span>
                  <p className={styles.abilityText}>{ability.text}</p>
                </li>
              ))}
            </ul>
          </Block>
        </>
      );
    case 'hrdina':
      return (
        <>
          <Block title={d.stats}>
            <dl className={styles.stats}>
              <Stat label={s.cost} value={content.cost} />
              <Stat label={s.strength} value={content.s1} />
              <Stat label={s.defense} value={content.s2} />
              <Stat label={s.magic} value={content.s3} />
            </dl>
          </Block>
          <Block title={d.ability}>
            <div className={styles.ability}>
              <span className={styles.abilityName}>{card.ab1}</span>
              <p className={styles.abilityText}>{card.ab1t}</p>
            </div>
          </Block>
          <Block title={d.quote}>
            <Prose>{card.subtitle}</Prose>
          </Block>
        </>
      );
    case 'prazdna':
      return (
        <>
          <Block title={d.format}>
            <Prose>{`${doc.formatW} × ${doc.formatH} ${cs.common.mm}`}</Prose>
          </Block>
          {content.subtitle && (
            <Block title={d.cardText}>
              <Prose>{content.subtitle}</Prose>
            </Block>
          )}
        </>
      );
  }
}

function Exports({ record }: { record: CardRecord }) {
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null);
  const [failed, setFailed] = useState(false);

  const run = async (kind: 'png' | 'pdf') => {
    setBusy(kind);
    setFailed(false);
    try {
      const { exportPdf, exportPng } = await import('../export/exportCard');
      const params = recordToParams(record);
      const name = record.title || cs.appName;
      if (kind === 'png') await exportPng(params, name);
      else await exportPdf(params, name, { w: record.formatW, h: record.formatH });
    } catch {
      setFailed(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Block title={d.exportHeading}>
      <div className={styles.exports}>
        <button type="button" className={ui.outline} disabled={busy !== null} onClick={() => void run('png')}>
          <Icon name="download" size={18} />
          {busy === 'png' ? w.exporting : w.exportPng}
        </button>
        <button type="button" className={ui.outline} disabled={busy !== null} onClick={() => void run('pdf')}>
          <Icon name="download" size={18} />
          {busy === 'pdf' ? w.exporting : w.exportPdf}
        </button>
      </div>
      {failed && (
        <p className={ui.error} role="alert">
          {w.exportFailed}
        </p>
      )}
    </Block>
  );
}

export function CardDetail() {
  const { id = '' } = useParams();
  const user = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [record, setRecord] = useState<CardRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [flip, setFlip] = useState(false);
  const [spin, setSpin] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [likesCount, setLikesCount] = useState(0);
  const [remixing, setRemixing] = useState(false);
  const [remixFailed, setRemixFailed] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const userId = user?.id;
  useEffect(() => {
    let active = true;
    setRecord(null);
    setMissing(false);
    setFailed(false);
    cards()
      .getOne(id, { expand: 'owner,template,remixOf,remixOf.owner' })
      .then((loaded) => {
        if (!active) return;
        setRecord(loaded);
        setLikesCount(loaded.likesCount);
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

  useEffect(() => () => clearTimeout(copyTimer.current), []);

  const ids = useMemo(() => (record ? [record.id] : []), [record]);
  const { liked, toggle } = useLikes(ids, { onCountChange: (_card, delta) => setLikesCount((count) => count + delta) });

  const doc = useMemo(() => (record ? normalizeCard(record) : null), [record]);
  const params = useMemo(() => (record ? recordToParams(record) : null), [record]);

  useEffect(() => {
    if (!record) return undefined;
    document.title = `${record.title || cs.card.defaults.titleBlank} · ${cs.appName}`;
    return () => {
      document.title = cs.appName;
    };
  }, [record]);

  if (missing) return <NotFound />;
  if (failed) {
    return (
      <main className={styles.main}>
        <p role="alert">{cs.common.somethingWrong}</p>
      </main>
    );
  }
  if (!record || !doc || !params) {
    return (
      <main>
        <p className={ui.spinnerRow}>{cs.common.loading}</p>
      </main>
    );
  }

  const owner = record.expand?.owner;
  const isOwner = user?.id === record.owner;
  const canEdit = isOwner || (user ? record.editors.includes(user.id) : false);
  const remixSource = record.expand?.remixOf;
  const template = record.expand?.template;

  const remix = async () => {
    if (!user) {
      navigate(signInPath(location.pathname));
      return;
    }
    setRemixing(true);
    setRemixFailed(false);
    try {
      const created = await remixCard(record, user.id);
      navigate(`/dilna/${created.id}`);
    } catch {
      setRemixFailed(true);
      setRemixing(false);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/karta/${record.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt(d.share, url);
      return;
    }
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  };

  const removeCard = async () => {
    setDeleteFailed(false);
    try {
      await cards().delete(record.id);
      navigate(owner ? profilePath(owner.handle) : '/', { replace: true });
    } catch {
      setDeleteFailed(true);
    }
  };

  return (
    <main className={styles.main}>
      <div className={styles.stage} aria-label={d.stageLabel} role="group">
        <div className={styles.cardHolder}>
          <svg viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true" className={styles.plinth}>
            <ellipse cx="200" cy="35" rx="192" ry="27" fill="none" stroke="#d6b067" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
            <ellipse cx="200" cy="35" rx="150" ry="18" fill="none" stroke="#d6b067" strokeOpacity="0.2" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          </svg>
          <Card3D {...params} flip={flip} spin={spin} unlocked={unlocked} resetKey={resetKey} interactive="drag" />
        </div>
        <div className={styles.toolbar}>
          <div className={ui.segmented + ' ' + ui.segmentedInset}>
            <button type="button" className={ui.segment} aria-pressed={!flip} onClick={() => setFlip(false)}>
              {w.front}
            </button>
            <button type="button" className={ui.segment} aria-pressed={flip} onClick={() => setFlip(true)}>
              {w.back}
            </button>
          </div>
          <button type="button" className={ui.iconButton} aria-pressed={spin} aria-label={w.spinLabel} onClick={() => setSpin((value) => !value)}>
            <Icon name="rotate" />
          </button>
          <button
            type="button"
            className={ui.iconButton}
            aria-label={w.straightenLabel}
            onClick={() => {
              setResetKey((key) => key + 1);
              setSpin(false);
            }}
          >
            <Icon name="straighten" />
          </button>
          <UnlockSwitch on={unlocked} onToggle={() => setUnlocked((value) => !value)} className={ui.outline} />
        </div>
        <p className={styles.hint}>{unlocked ? w.unlockHint : w.dragHint}</p>
      </div>

      <div className={styles.info}>
        <div className={styles.titles}>
          <p className={ui.eyebrow}>{kindLine(doc)}</p>
          <h1 className={styles.title}>{record.title || cs.card.defaults.titleBlank}</h1>
          <p className={styles.meta}>
            {owner && (
              <>
                {d.byAuthor}
                <Link to={profilePath(owner.handle)}>@{owner.handle}</Link>
              </>
            )}
            {template && (
              <span>
                {' · '}
                {d.template}
                {template.name}
              </span>
            )}
            {record.visibility !== 'public' && <span className={ui.badge}>{cs.visibility[record.visibility]}</span>}
          </p>
          {remixSource && (
            <p className={styles.meta}>
              {d.remixOf}
              <Link to={`/karta/${remixSource.id}`}>{remixSource.title || cs.card.defaults.titleBlank}</Link>
              {remixSource.expand?.owner && ` · @${(remixSource.expand.owner as { handle: string }).handle}`}
            </p>
          )}
        </div>

        <div className={styles.actions}>
          {canEdit && (
            <Link to={`/dilna/${record.id}`} className={ui.primary}>
              <Icon name="pencil" size={18} />
              {d.edit}
            </Link>
          )}
          <button type="button" className={ui.outline} aria-pressed={Boolean(liked[record.id])} onClick={() => void toggle(record.id)}>
            <Icon name="heart" size={18} fill={liked[record.id] ? 'var(--gold)' : 'none'} style={{ color: 'var(--gold)' }} />
            {d.like}
            <span className={styles.likeCount}>{likesCount}</span>
          </button>
          <button type="button" className={ui.outline} disabled={remixing} onClick={() => void remix()}>
            <Icon name="sync" size={18} />
            {remixing ? d.remixing : d.remix}
          </button>
          <button
            type="button"
            className={ui.outline}
            onClick={() => {
              if (user) setDeckOpen(true);
              else navigate(signInPath(location.pathname));
            }}
          >
            <Icon name="cards" size={18} />
            {d.addToDeck}
          </button>
          <button type="button" className={ui.outline} onClick={() => void share()}>
            <Icon name="share" size={18} />
            {copied ? d.copied : d.share}
          </button>
        </div>
        {remixFailed && (
          <p className={ui.error} role="alert">
            {d.remixFailed}
          </p>
        )}

        <Meaning doc={doc} card={resolveCard(params)} />

        {isOwner && <Exports record={record} />}

        {isOwner && (
          <div>
            <button type="button" className={ui.ghost} onClick={() => setDeleteOpen(true)}>
              <Icon name="trash" size={18} />
              {d.deleteCard}
            </button>
          </div>
        )}
      </div>

      {deckOpen && user && <AddToDeckDialog cardId={record.id} ownerId={user.id} onClose={() => setDeckOpen(false)} />}

      <Dialog open={deleteOpen} title={d.deleteTitle} onClose={() => setDeleteOpen(false)}>
        <p>{d.deleteText}</p>
        {deleteFailed && (
          <p className={ui.alert} role="alert">
            {d.deleteFailed}
          </p>
        )}
        <div className={ui.dialogActions}>
          <button type="button" className={ui.outline} onClick={() => setDeleteOpen(false)}>
            {cs.common.cancel}
          </button>
          <button type="button" className={ui.primary} onClick={() => void removeCard()}>
            {d.deleteConfirm}
          </button>
        </div>
      </Dialog>
    </main>
  );
}
