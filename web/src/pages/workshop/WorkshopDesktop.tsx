import { useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { Card3D, type CardTurn } from '../../card/Card3D';
import { Icon, type IconName } from '../../components/Icon';
import { ui } from '../../components/ui';
import { UnlockSwitch } from '../../components/UnlockSwitch';
import { cs } from '../../i18n/cs';
import { useWorkshop } from './context';
import { LAYERS } from './constants';
import { AddItems, LayerList, SettingsPanel, TemplatePicker } from './panels';
import { CardControls, kindLine, SaveBadge } from './shared';
import styles from './Workshop.module.css';

const w = cs.workshop;

const AVATAR_COLORS = ['#4a3a86', '#2e5a52', '#6a3a52', '#3a5486'];

function Presence() {
  const { others } = useWorkshop();
  if (others.length === 0) return null;
  return (
    <div className={styles.presence}>
      {others.slice(0, 4).map((user, i) => (
        <span key={user.id} aria-hidden="true" title={`@${user.handle}`} className={styles.presenceAvatar} style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
          {(user.displayName || user.handle).charAt(0).toUpperCase()}
        </span>
      ))}
      <span className="sr-only">{w.othersEditing(others.map((user) => user.handle))}</span>
    </div>
  );
}

function Header() {
  const { doc, record, isOwner, canUndo, canRedo, undo, redo, publishing, publish, openShare } = useWorkshop();
  return (
    <header className={styles.header}>
      <Link to="/" className={styles.back}>
        <Icon name="back" strokeWidth={1.8} />
        {w.backToGallery}
      </Link>
      <div aria-hidden="true" className={styles.divider} />
      <div className={styles.titles}>
        <span className={styles.title}>{doc.title || cs.card.defaults.titleBlank}</span>
        <span className={styles.kind}>{kindLine(doc)}</span>
      </div>
      <div className={styles.history}>
        <button type="button" className={styles.historyButton} aria-label={w.undo} disabled={!canUndo} onClick={undo}>
          <Icon name="undo" />
        </button>
        <button type="button" className={styles.historyButton} aria-label={w.redo} disabled={!canRedo} onClick={redo}>
          <Icon name="redo" />
        </button>
      </div>
      <div className={styles.headerActions}>
        <SaveBadge />
        <Presence />
        <Link to={`/karta/${record.id}`} className={ui.outline} target="_blank" rel="noopener">
          <Icon name="eye" size={18} />
          {w.preview}
        </Link>
        <button type="button" className={ui.outline} onClick={openShare}>
          <Icon name="share" size={18} />
          {w.share}
        </button>
        {isOwner &&
          (record.visibility === 'public' ? (
            <button type="button" className={ui.outline} onClick={openShare}>
              <Icon name="check" size={18} strokeWidth={2} />
              {w.isPublic}
            </button>
          ) : (
            <button type="button" className={ui.primary} disabled={publishing} onClick={publish}>
              {publishing ? w.publishing : w.publish}
            </button>
          ))}
      </div>
    </header>
  );
}

function LeftPanel() {
  const { doc } = useWorkshop();
  return (
    <aside aria-label={w.templatesSection} className={styles.left}>
      <TemplatePicker />
      <section className={styles.layersSection}>
        <div className={styles.layersHead}>
          <h2 className={styles.panelHeading}>{w.layersTitle}</h2>
          <span className={styles.layerCount}>{w.layerCount(LAYERS[doc.family].length + doc.content.elements.length)}</span>
        </div>
        <LayerList />
      </section>
      <section className={styles.addSection}>
        <h2 className={styles.panelHeading}>{w.addElement}</h2>
        <AddItems />
        <p className={styles.addNote}>{w.addElementHint}</p>
      </section>
    </aside>
  );
}

function formatLine(formatW: number, formatH: number, family: string) {
  const kind = family === 'bestie' || family === 'hrdina' ? w.formatTcg : family === 'prazdna' ? w.formatCustom : w.formatTarot;
  return `${formatW} × ${formatH} ${cs.common.mm} · ${kind}`;
}

function Stage() {
  const { doc, params, flip, spin, unlocked, toggleUnlocked, light, setLight, zoom, zoomBy, resetKey, turnBy, itemEditing, uploadArtwork } = useWorkshop();
  const [dropping, setDropping] = useState(false);

  const onDragOver = (e: DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setDropping(true);
    }
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDropping(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadArtwork(file);
  };

  return (
    <main aria-label={w.stageLabel} className={styles.stage} data-dropping={dropping} onDragOver={onDragOver} onDragLeave={() => setDropping(false)} onDrop={onDrop}>
      <div className={styles.stageTop}>
        <span className={styles.formatPill}>
          <Icon name="card" size={14} strokeWidth={1.8} />
          {formatLine(doc.formatW, doc.formatH, doc.family)}
        </span>
        <div className={styles.zoom}>
          <button type="button" className={styles.zoomButton} aria-label={w.zoomOut} onClick={() => zoomBy(-10)}>
            <Icon name="minus" size={18} strokeWidth={2} />
          </button>
          <span className={styles.zoomValue}>{zoom} %</span>
          <button type="button" className={styles.zoomButton} aria-label={w.zoomIn} onClick={() => zoomBy(10)}>
            <Icon name="plusSmall" size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className={styles.cardHolder} style={{ width: `calc(clamp(220px, 23vw, 320px) * ${(zoom / 100).toFixed(2)})` }}>
        <svg viewBox="0 0 400 70" preserveAspectRatio="none" aria-hidden="true" className={styles.plinth}>
          <ellipse cx="200" cy="35" rx="192" ry="27" fill="none" stroke="#d6b067" strokeOpacity="0.35" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          <ellipse cx="200" cy="35" rx="150" ry="18" fill="none" stroke="#d6b067" strokeOpacity="0.2" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        </svg>
        <Card3D {...params} light={light} flip={flip} spin={spin} unlocked={unlocked} resetKey={resetKey} turnBy={turnBy} editing={itemEditing} interactive="drag" />
      </div>

      <div className={styles.toolbar}>
        <CardControls className={styles.sideSwitch} />
        <SpinButton />
        <UnlockSwitch on={unlocked} onToggle={toggleUnlocked} className={styles.toolButton} />
        <StraightenButton />
        <TurnButtons />
        <label className={styles.lightLabel}>
          <Icon name="sun" size={18} />
          {w.light}
          <input type="range" min={0} max={100} step={1} value={light} className={styles.lightInput} onChange={(e) => setLight(Number(e.target.value))} />
        </label>
      </div>
      <p className={styles.hint}>{dropping ? w.dropHint : unlocked ? w.unlockHint : w.dragHint}</p>
    </main>
  );
}

function SpinButton() {
  const { spin, toggleSpin } = useWorkshop();
  return (
    <button type="button" className={styles.toolButton} aria-pressed={spin} onClick={toggleSpin}>
      <Icon name="rotate" size={18} />
      {w.spin}
    </button>
  );
}

/** The pose in steps, for a keyboard or for setting an exact angle. */
const TURN_STEP = 30;

const TURNS: { label: string; icon: IconName; turn: CardTurn }[] = [
  { label: w.turnLeft, icon: 'chevronLeft', turn: { y: -TURN_STEP } },
  { label: w.turnRight, icon: 'chevronRight', turn: { y: TURN_STEP } },
  { label: w.turnUp, icon: 'chevronUp', turn: { x: TURN_STEP } },
  { label: w.turnDown, icon: 'chevronDown', turn: { x: -TURN_STEP } },
  { label: w.rollLeft, icon: 'rotateLeft', turn: { z: -TURN_STEP } },
  { label: w.rollRight, icon: 'rotate', turn: { z: TURN_STEP } },
];

function TurnButtons() {
  const { turnCard } = useWorkshop();
  return (
    <div role="group" aria-label={w.turnGroup} className={styles.turns}>
      {TURNS.map(({ label, icon, turn }) => (
        <button key={label} type="button" className={styles.turnButton} aria-label={label} title={label} onClick={() => turnCard({ ...turn })}>
          <Icon name={icon} size={18} strokeWidth={2} />
        </button>
      ))}
    </div>
  );
}

function StraightenButton() {
  const { straighten } = useWorkshop();
  return (
    <button type="button" className={styles.toolButton} onClick={straighten}>
      <Icon name="straighten" size={18} />
      {w.straighten}
    </button>
  );
}

export function WorkshopDesktop() {
  return (
    <div className={styles.root}>
      <Header />
      <div className={styles.body}>
        <LeftPanel />
        <Stage />
        <aside aria-label={w.propertiesLabel} className={styles.right}>
          <SettingsPanel />
        </aside>
      </div>
    </div>
  );
}
