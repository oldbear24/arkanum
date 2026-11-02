import { useEffect, useId, useRef, useState, type ChangeEvent, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import { PAL } from '../../card/resolve';
import { counts, ranges, textLimits, type CardAbility, type CardContent } from '../../card/spec';
import { Icon } from '../../components/Icon';
import { cs } from '../../i18n/cs';
import { pb } from '../../lib/pb';
import { useWorkshop, type ArtTarget, type TabId } from './context';
import { ARCANAS, ARTS, BLANK_OPTION, EDGES, ELEMENTS, FOILS, FONTS, FRAMES, LAYERS, LAYER_ICONS, PALETTES, SURFACES, VARIANT_OPTIONS, dataTabLabel, millimetres } from './constants';
import styles from './panels.module.css';

const w = cs.workshop;

function cx(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(' ');
}

function Section({ title, children, tight }: { title?: string; children: ReactNode; tight?: boolean }) {
  return (
    <section className={cx(styles.section, tight && styles.sectionTight)}>
      {title && <h3 className={styles.heading}>{title}</h3>}
      {children}
    </section>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  placeholder?: string;
  look?: 'jost' | 'serif' | 'display';
}

function TextField({ label, value, onChange, maxLength, placeholder, look = 'jost' }: TextFieldProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        className={cx(styles.input, look === 'serif' && styles.inputSerif, look === 'display' && styles.inputDisplay)}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows: number;
  maxLength?: number;
  italic?: boolean;
  placeholder?: string;
}

function TextArea({ label, value, onChange, rows, maxLength, italic, placeholder }: TextAreaProps) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <textarea
        id={id}
        className={cx(styles.textarea, italic && styles.textareaItalic)}
        rows={rows}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface RangeProps {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function RangeRow({ label, value, display, min, max, step, onChange }: RangeProps) {
  const id = useId();
  return (
    <div className={styles.range}>
      <div className={styles.rangeHead}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <span className={styles.rangeValue}>{display}</span>
      </div>
      <input id={id} type="range" className={styles.rangeInput} min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

function pressed(on: boolean) {
  return { 'aria-pressed': on } as const;
}

// ---------------------------------------------------------------- artwork

function ArtRow({ name, url, target, onRemove, extra }: { name: string; url: string; target: ArtTarget; onRemove: () => void; extra?: ReactNode }) {
  const { doc, setPlacement } = useWorkshop();
  const transform = doc.artworkTransform;
  const placement = target === 'main' ? transform : (transform.layers[target] ?? { x: 0, y: 0, zoom: 1 });

  return (
    <div className={styles.artRow}>
      <div className={styles.artHead}>
        <img src={url} alt="" className={styles.artThumb} />
        <span className={styles.artName}>{name}</span>
        {extra}
        <button type="button" className={styles.artIcon} aria-label={w.removeImage + name} onClick={onRemove}>
          <Icon name="trash" size={18} />
        </button>
      </div>
      <RangeRow label={w.positionX} value={placement.x} display={`${placement.x} %`} min={ranges.artOffset[0]} max={ranges.artOffset[1]} step={1} onChange={(x) => setPlacement(target, { x })} />
      <RangeRow label={w.positionY} value={placement.y} display={`${placement.y} %`} min={ranges.artOffset[0]} max={ranges.artOffset[1]} step={1} onChange={(y) => setPlacement(target, { y })} />
      <RangeRow
        label={w.artZoom}
        value={placement.zoom}
        display={`${Math.round(placement.zoom * 100)} %`}
        min={ranges.artZoom[0]}
        max={ranges.artZoom[1]}
        step={0.05}
        onChange={(zoom) => setPlacement(target, { zoom })}
      />
    </div>
  );
}

function FilePicker({ label, onFile, disabled, dashed = true }: { label: string; onFile: (file: File) => void; disabled: boolean; dashed?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onFile(file);
  };
  return (
    <>
      <button type="button" className={dashed ? styles.upload : styles.uploadQuiet} disabled={disabled} onClick={() => input.current?.click()}>
        <Icon name="upload" size={18} />
        {label}
      </button>
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className={styles.fileInput} tabIndex={-1} aria-hidden="true" onChange={onChange} />
    </>
  );
}

function ArtworkControls() {
  const { record, uploading, uploadError, uploadArtwork, removeArtwork, addLayer, removeLayer, moveLayer } = useWorkshop();
  const layers = record.artworkLayers ?? [];
  const names = layers.length <= 1 ? w.artLayerNames.one : layers.length === 2 ? w.artLayerNames.two : w.artLayerNames.three;

  return (
    <>
      <FilePicker label={uploading ? w.uploading : record.artwork ? w.replaceArtwork : w.uploadArtwork} onFile={uploadArtwork} disabled={uploading} />
      {uploadError && (
        <p className={styles.error} role="alert">
          {uploadError}
        </p>
      )}
      {record.artwork && <ArtRow name={w.customArtwork} url={pb.files.getURL(record, record.artwork, { thumb: '600x0' })} target="main" onRemove={removeArtwork} />}

      {(record.artwork || layers.length > 0) && (
        <div className={styles.layersHead}>
          <h4 className={styles.subheading}>{w.parallaxLayers}</h4>
          <p className={styles.note}>{w.parallaxHint}</p>
        </div>
      )}
      {layers.map((file, i) => {
        const name = names[i] ?? `${i + 1}`;
        return (
          <ArtRow
            key={file}
            name={name}
            url={pb.files.getURL(record, file, { thumb: '600x0' })}
            target={i}
            onRemove={() => removeLayer(i)}
            extra={
              <>
                <button type="button" className={styles.artIcon} aria-label={w.moveLayerUp + name} disabled={i === layers.length - 1} onClick={() => moveLayer(i, 1)}>
                  <Icon name="chevronUp" size={18} />
                </button>
                <button type="button" className={styles.artIcon} aria-label={w.moveLayerDown + name} disabled={i === 0} onClick={() => moveLayer(i, -1)}>
                  <Icon name="chevronDown" size={18} />
                </button>
              </>
            }
          />
        );
      })}
      {(record.artwork || layers.length > 0) && layers.length < counts.artworkLayers && <FilePicker label={w.addParallaxLayer} onFile={addLayer} disabled={uploading} dashed={false} />}
    </>
  );
}

// ---------------------------------------------------------------- "Vzhled"

function TemplatePicker() {
  const { compact, doc, requestTemplate } = useWorkshop();
  const options = doc.family === 'prazdna' ? [...VARIANT_OPTIONS, BLANK_OPTION] : VARIANT_OPTIONS;
  return (
    <Section title={w.template}>
      <div className={styles.grid2}>
        {options.map((option) => (
          <button key={option.id} type="button" className={compact ? styles.optTight : styles.optTemplate} {...pressed(doc.family === option.id)} onClick={() => requestTemplate(option.id)}>
            {!compact && <Icon path={option.icon} strokeWidth={1.6} />}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

export function LayerList() {
  const { doc, selectedLayer, selectLayer, setLook } = useWorkshop();
  const list = LAYERS[doc.family];
  return (
    <ul className={styles.layers}>
      {list.map((layer) => {
        const canHide = layer.group !== 'base';
        const shown = layer.group === 'base' ? true : doc.look.visible[layer.group];
        const on = selectedLayer === layer.id;
        return (
          <li key={layer.id} className={styles.layer} data-on={on}>
            <button type="button" className={styles.layerPick} style={{ opacity: shown ? 1 : 0.5 }} {...pressed(on)} onClick={() => selectLayer(layer.id, layer.tab)}>
              <Icon name={LAYER_ICONS[layer.group]} size={18} strokeWidth={1.6} />
              <span className={styles.layerName}>{layer.label}</span>
            </button>
            {layer.group !== 'base' && canHide ? (
              <button
                type="button"
                className={styles.layerEye}
                style={{ color: shown ? 'var(--text-3)' : '#7c759c' }}
                aria-label={(shown ? w.hideLayer : w.showLayer) + layer.label}
                onClick={() => setLook({ visible: { ...doc.look.visible, [layer.group]: !shown } })}
              >
                <Icon name={shown ? 'eye' : 'eyeOff'} size={18} strokeWidth={1.6} />
              </button>
            ) : (
              <span className={styles.layerLock}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label={w.lockedLayer}>
                  <path d="M7 11V8A5 5 0 0 1 17 8V11M5.5 11H18.5V20H5.5Z" />
                </svg>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function LookTab() {
  const { compact, doc, setLook, setTitle, setContent } = useWorkshop();
  const { look } = doc;
  const isTarot = doc.family === 'tarot';
  const isTcg = doc.family === 'bestie' || doc.family === 'hrdina';

  return (
    <>
      {compact && <TemplatePicker />}
      <Section title={w.illustration}>
        {isTarot ? (
          <div className={styles.grid2}>
            {ARTS.map((art) => (
              <button
                key={art.id}
                type="button"
                className={styles.optArt}
                {...pressed(look.art === art.id)}
                onClick={() => {
                  setLook({ art: art.id });
                  setTitle(art.label);
                  setContent({ numeral: art.numeral });
                }}
              >
                <span className={styles.optArtNum}>{art.numeral}</span>
                <span>{art.label}</span>
              </button>
            ))}
          </div>
        ) : (
          !compact && (
            <div className={styles.artInfo}>
              <span className={styles.artInfoIcon}>
                <Icon name="image" size={22} strokeWidth={1.6} />
              </span>
              <span className={styles.artInfoText}>
                <span className={styles.artInfoName}>{w.artNames[doc.family as keyof typeof w.artNames]}</span>
                <span className={styles.artInfoNote}>{w.sampleIllustration}</span>
              </span>
            </div>
          )
        )}
        <ArtworkControls />
      </Section>

      {!isTcg && (
        <>
          <Section title={w.frame}>
            <div className={compact ? styles.grid4 : styles.grid2}>
              {FRAMES.map((frame) => (
                <button key={frame.id} type="button" className={compact ? styles.optColumn : styles.optRow} {...pressed(look.frame === frame.id)} onClick={() => setLook({ frame: frame.id })}>
                  <svg width={compact ? 20 : 24} height={compact ? 30 : 36} viewBox="20 56 260 378" aria-hidden="true">
                    <path d={frame.win} fill="none" stroke="#d6b067" strokeWidth={compact ? 16 : 14} strokeLinejoin="round" />
                  </svg>
                  <span>{compact ? frame.short : frame.label}</span>
                </button>
              ))}
            </div>
          </Section>
          <Section title={compact ? w.paletteShort : w.palette}>
            <div className={styles.grid4}>
              {PALETTES.map((palette) => (
                <button key={palette.id} type="button" className={styles.optColumn} {...pressed(look.palette === palette.id)} onClick={() => setLook({ palette: palette.id })}>
                  <span aria-hidden="true" className={styles.swatchRound} style={{ background: palette.base }}>
                    <span className={styles.swatchDot} style={{ background: palette.gold }} />
                  </span>
                  <span>{palette.label}</span>
                </button>
              ))}
            </div>
          </Section>
        </>
      )}

      {doc.family === 'bestie' && (
        <Section title={w.element}>
          <div className={styles.pills}>
            {ELEMENTS.map((element) => (
              <button key={element.id} type="button" className={styles.optPill} {...pressed(look.element === element.id)} onClick={() => setLook({ element: element.id })}>
                <span aria-hidden="true" className={styles.pillDot} style={{ background: element.color }} />
                {element.label}
              </button>
            ))}
          </div>
        </Section>
      )}

      <Section tight>
        <RangeRow label={w.depth} value={look.depth} display={`${look.depth} %`} min={ranges.depth[0]} max={ranges.depth[1]} step={1} onChange={(depth) => setLook({ depth }, 'depth')} />
      </Section>

      {compact && (
        <Section title={w.layersTitle}>
          <LayerList />
        </Section>
      )}
    </>
  );
}

// ---------------------------------------------------------------- "Materiál"

function FoilSection() {
  const { compact, doc, setLook } = useWorkshop();
  const { look } = doc;
  return (
    <Section title={w.foil}>
      <div className={compact ? styles.grid4 : styles.grid2}>
        {FOILS.map((foil) => (
          <button key={foil.id} type="button" className={compact ? styles.optColumn : styles.optRow} {...pressed(look.foil === foil.id)} onClick={() => setLook({ foil: foil.id })}>
            <span aria-hidden="true" className={styles.swatchSquare} style={{ background: foil.swatch }} />
            <span>{compact ? foil.short : foil.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.foilIntensity}>
        <RangeRow label={w.foilIntensity} value={look.foilI} display={`${look.foilI} %`} min={ranges.foilI[0]} max={ranges.foilI[1]} step={1} onChange={(foilI) => setLook({ foilI }, 'foilI')} />
      </div>
    </Section>
  );
}

function SurfaceSection() {
  const { doc, setLook } = useWorkshop();
  const { look } = doc;
  const labelId = useId();
  return (
    <Section title={w.surface}>
      <div className={styles.segments3}>
        {SURFACES.map((surface) => (
          <button key={surface.id} type="button" className={styles.optSegment} {...pressed(look.surface === surface.id)} onClick={() => setLook({ surface: surface.id })}>
            {surface.label}
          </button>
        ))}
      </div>
      <div className={styles.switchRow}>
        <span id={labelId} className={styles.switchLabel}>
          <span className={styles.switchName}>{w.emboss}</span>
          <span className={styles.switchNote}>{w.embossHint}</span>
        </span>
        <button type="button" role="switch" aria-checked={look.emboss} aria-labelledby={labelId} className={styles.switch} onClick={() => setLook({ emboss: !look.emboss })}>
          <span aria-hidden="true" className={styles.switchTrack} style={{ background: look.emboss ? 'var(--gold-track)' : 'var(--option)' }}>
            <span className={styles.switchKnob} style={{ left: look.emboss ? 26 : 3 }} />
          </span>
        </button>
      </div>
    </Section>
  );
}

function EdgeSection() {
  const { compact, doc, setLook } = useWorkshop();
  const cardBase = doc.family === 'bestie' ? '#15171c' : doc.family === 'hrdina' ? '#1a1512' : PAL[doc.look.palette].base;
  return (
    <Section title={w.edge}>
      <div className={styles.grid4}>
        {EDGES.map((edge) => (
          <button key={edge.id} type="button" className={styles.optColumn} {...pressed(doc.look.edge === edge.id)} onClick={() => setLook({ edge: edge.id })}>
            <span aria-hidden="true" className={styles.swatchEdge} style={{ background: edge.swatch ?? cardBase }} />
            <span>{compact ? edge.short : edge.label}</span>
          </button>
        ))}
      </div>
    </Section>
  );
}

function ThicknessRange() {
  const { doc, setLook } = useWorkshop();
  return <RangeRow label={w.thickness} value={doc.look.thick} display={millimetres(doc.look.thick * 0.15, 2)} min={ranges.thick[0]} max={ranges.thick[1]} step={0.5} onChange={(thick) => setLook({ thick }, 'thick')} />;
}

function RadiusRange() {
  const { doc, setLook } = useWorkshop();
  return <RangeRow label={w.radius} value={doc.look.radius} display={millimetres((doc.look.radius * doc.formatW) / 300, 1)} min={ranges.radius[0]} max={ranges.radius[1]} step={1} onChange={(radius) => setLook({ radius }, 'radius')} />;
}

function MaterialTab() {
  const { compact } = useWorkshop();
  if (compact) {
    return (
      <>
        <FoilSection />
        <EdgeSection />
        <Section tight>
          <ThicknessRange />
          <RadiusRange />
        </Section>
        <SurfaceSection />
      </>
    );
  }
  return (
    <>
      <FoilSection />
      <SurfaceSection />
      <EdgeSection />
      <Section title={w.shape}>
        <ThicknessRange />
        <RadiusRange />
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- "Text"

function TextTab() {
  const { doc, setTitle, setContent, setLook } = useWorkshop();
  const { content } = doc;
  const element = cs.card.elements[doc.look.element];
  const subtitle = (value: string) => setContent({ subtitle: value }, 'subtitle');

  return (
    <>
      <Section tight>
        <TextField label={w.cardTitle} value={doc.title} maxLength={textLimits.title} onChange={setTitle} />
        {doc.family === 'tarot' && <TextField label={w.numeral} look="display" value={content.numeral} maxLength={textLimits.numeral} onChange={(numeral) => setContent({ numeral }, 'numeral')} />}
        {doc.family === 'orakulum' && <TextField label={w.message} look="serif" value={content.subtitle} maxLength={40} onChange={subtitle} />}
        {doc.family === 'bestie' && <TextField label={w.creatureDescription} look="serif" value={content.subtitle} maxLength={34} placeholder={w.creatureHint + element} onChange={subtitle} />}
        {doc.family === 'hrdina' && (
          <>
            <TextField label={w.classRarity} value={content.cls} maxLength={textLimits.cls} onChange={(cls) => setContent({ cls }, 'cls')} />
            <TextArea label={w.quote} italic rows={2} value={content.subtitle} maxLength={textLimits.subtitle} onChange={subtitle} />
          </>
        )}
        {doc.family === 'prazdna' && <TextArea label={w.cardText} italic rows={3} value={content.subtitle} maxLength={textLimits.subtitle} onChange={subtitle} />}
      </Section>
      <Section title={w.titleFont}>
        <div className={styles.grid2}>
          {FONTS.map((font) => (
            <button key={font.id} type="button" className={styles.optFont} {...pressed(doc.look.font === font.id)} onClick={() => setLook({ font: font.id })}>
              <span className={styles.fontSample} style={{ fontFamily: font.family, fontWeight: font.weight } as CSSProperties}>
                {w.fontSample}
              </span>
              <span className={styles.fontName}>{font.label}</span>
            </button>
          ))}
        </div>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- "Význam", "Výklad", "Hra"

function Keywords() {
  const { doc, setMeaning } = useWorkshop();
  const [adding, setAdding] = useState(false);
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const { keywords } = doc.meaning;

  useEffect(() => {
    if (adding) input.current?.focus();
  }, [adding]);

  const commit = () => {
    const keyword = value.trim();
    if (keyword && !keywords.includes(keyword) && keywords.length < counts.keywords) {
      setMeaning({ keywords: [...keywords, keyword] });
    }
    setValue('');
    setAdding(false);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      setValue('');
      setAdding(false);
    }
  };

  return (
    <Section title={w.keywords}>
      <div className={styles.pills}>
        {keywords.map((keyword) => (
          <span key={keyword} className={styles.keyword}>
            {keyword}
            <button type="button" className={styles.keywordRemove} aria-label={w.removeKeyword + keyword} onClick={() => setMeaning({ keywords: keywords.filter((k) => k !== keyword) })}>
              <Icon name="close" size={14} strokeWidth={2} />
            </button>
          </span>
        ))}
        {adding ? (
          <input
            ref={input}
            type="text"
            className={styles.keywordInput}
            aria-label={w.newKeyword}
            maxLength={textLimits.keyword}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commit}
          />
        ) : (
          keywords.length < counts.keywords && (
            <button type="button" className={styles.keywordAdd} onClick={() => setAdding(true)}>
              <Icon name="plus" size={14} strokeWidth={2} />
              {w.addKeyword}
            </button>
          )
        )}
      </div>
    </Section>
  );
}

function Stepper({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <div className={styles.stepperRow}>
      <span className={styles.stepperLabel}>{label}</span>
      <div className={styles.stepper}>
        <button type="button" className={styles.stepperButton} aria-label={w.decrease + label} onClick={() => onChange(Math.max(min, value - step))}>
          <Icon name="minus" size={16} strokeWidth={2} />
        </button>
        <span className={styles.stepperValue}>{value}</span>
        <button type="button" className={styles.stepperButton} aria-label={w.increase + label} onClick={() => onChange(Math.min(max, value + step))}>
          <Icon name="plusSmall" size={16} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function AbilityField({ index, ability, title, down, up, effect }: { index: number; ability: CardAbility; title: string; down: string; up: string; effect: string }) {
  const { setAbility } = useWorkshop();
  const id = useId();
  const power = (delta: number) => setAbility(index, { power: Math.max(ranges.power[0], Math.min(ranges.power[1], ability.power + delta)) });
  return (
    <>
      <div className={styles.field}>
        <label htmlFor={id} className={styles.label}>
          {title}
          {w.powerSuffix}
          {ability.power}
        </label>
        <div className={styles.abilityRow}>
          <input id={id} type="text" className={cx(styles.input, styles.abilityInput)} maxLength={textLimits.abilityName} value={ability.name} onChange={(e) => setAbility(index, { name: e.target.value }, `ability-${index}`)} />
          <button type="button" className={styles.abilityButton} aria-label={down} onClick={() => power(-10)}>
            <Icon name="minus" size={16} strokeWidth={2} />
          </button>
          <button type="button" className={styles.abilityButton} aria-label={up} onClick={() => power(10)}>
            <Icon name="plusSmall" size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
      <TextField label={effect} look="serif" maxLength={textLimits.abilityText} value={ability.text} onChange={(text) => setAbility(index, { text }, `ability-text-${index}`)} />
    </>
  );
}

function DataTab() {
  const { doc, setMeaning, setContent, setAbility } = useWorkshop();
  const { content, meaning } = doc;
  const stat = (key: keyof CardContent) => (value: number) => setContent({ [key]: value }, `stat-${key}`);
  const first = content.abilities[0];
  const second = content.abilities[1];
  const s = w.stats;

  if (doc.family === 'tarot') {
    return (
      <>
        <Section title={w.arcana}>
          <div className={styles.segments2}>
            {ARCANAS.map((arcana) => (
              <button key={arcana.id} type="button" className={styles.optSegment} {...pressed(meaning.arcana === arcana.id)} onClick={() => setMeaning({ arcana: arcana.id })}>
                {arcana.label}
              </button>
            ))}
          </div>
        </Section>
        <Section tight>
          <TextArea label={w.upright} rows={3} value={meaning.upright} maxLength={textLimits.upright} onChange={(upright) => setMeaning({ upright }, 'upright')} />
          <TextArea label={w.reversed} rows={3} value={meaning.reversed} maxLength={textLimits.reversed} onChange={(reversed) => setMeaning({ reversed }, 'reversed')} />
        </Section>
        <Keywords />
      </>
    );
  }

  if (doc.family === 'orakulum') {
    return (
      <Section tight>
        <TextArea label={w.reading} rows={5} value={meaning.upright} maxLength={textLimits.upright} onChange={(upright) => setMeaning({ upright }, 'upright')} />
      </Section>
    );
  }

  return (
    <>
      <Section title={w.properties}>
        {doc.family === 'hrdina' ? (
          <>
            <Stepper label={s.cost} value={content.cost} min={ranges.cost[0]} max={ranges.cost[1]} step={1} onChange={stat('cost')} />
            <Stepper label={s.strength} value={content.s1} min={ranges.s1[0]} max={ranges.s1[1]} step={1} onChange={stat('s1')} />
            <Stepper label={s.defense} value={content.s2} min={ranges.s2[0]} max={ranges.s2[1]} step={1} onChange={stat('s2')} />
            <Stepper label={s.magic} value={content.s3} min={ranges.s3[0]} max={ranges.s3[1]} step={1} onChange={stat('s3')} />
          </>
        ) : (
          <>
            <Stepper label={s.hp} value={content.hp} min={ranges.hp[0]} max={ranges.hp[1]} step={10} onChange={stat('hp')} />
            <Stepper label={s.level} value={content.level} min={ranges.level[0]} max={ranges.level[1]} step={1} onChange={stat('level')} />
            <Stepper label={s.attack} value={content.s1} min={ranges.s1[0]} max={ranges.s1[1]} step={1} onChange={stat('s1')} />
            <Stepper label={s.defense} value={content.s2} min={ranges.s2[0]} max={ranges.s2[1]} step={1} onChange={stat('s2')} />
          </>
        )}
      </Section>

      {doc.family === 'bestie' && first && second && (
        <>
          <Section title={w.abilities}>
            <AbilityField index={0} ability={first} title={w.firstAbility} down={w.lowerFirst} up={w.raiseFirst} effect={w.firstEffect} />
            <AbilityField index={1} ability={second} title={w.secondAbility} down={w.lowerSecond} up={w.raiseSecond} effect={w.secondEffect} />
          </Section>
          <Section title={w.rarity}>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" className={styles.star} aria-label={w.rarityOf(n)} {...pressed(content.rarity >= n)} onClick={() => setContent({ rarity: n })}>
                  <Icon name="star" size={24} strokeWidth={1.5} fill={content.rarity >= n ? 'var(--gold)' : 'none'} />
                </button>
              ))}
            </div>
          </Section>
        </>
      )}

      {doc.family === 'hrdina' && first && (
        <Section tight>
          <TextField label={w.ability} maxLength={textLimits.abilityName} value={first.name} onChange={(name) => setAbility(0, { name }, 'ability-0')} />
          <TextArea label={w.abilityEffect} rows={3} maxLength={textLimits.abilityText} value={first.text} onChange={(text) => setAbility(0, { text }, 'ability-text-0')} />
        </Section>
      )}
    </>
  );
}

// ---------------------------------------------------------------- shared

function ExportSection() {
  const { exporting, exportCard, exportFailed } = useWorkshop();
  return (
    <section className={cx(styles.section, styles.sectionLast)}>
      <h3 className={styles.heading}>{w.exportTitle}</h3>
      <div className={styles.grid3}>
        <button type="button" className={styles.export} disabled={exporting !== null} onClick={() => exportCard('png')}>
          <span className={styles.exportName}>{exporting === 'png' ? w.exporting : w.exportPng}</span>
          <span className={styles.exportNote}>{w.exportPngHint}</span>
        </button>
        <button type="button" className={styles.export} disabled={exporting !== null} onClick={() => exportCard('pdf')}>
          <span className={styles.exportName}>{exporting === 'pdf' ? w.exporting : w.exportPdf}</span>
          <span className={styles.exportNote}>{w.exportPdfHint}</span>
        </button>
        <button type="button" className={styles.export} disabled>
          <span className={styles.exportName}>{w.exportGlb}</span>
          <span className={styles.exportNote}>{w.exportGlbHint}</span>
        </button>
      </div>
      {exportFailed && (
        <p className={styles.error} role="alert">
          {w.exportFailed}
        </p>
      )}
    </section>
  );
}

const TAB_ICONS: Record<TabId, string> = {
  vzhled: 'palette',
  material: 'sparkle',
  text: 'text',
  data: 'book',
};

/** The tabs of the settings. The same controls serve the desktop panel and the phone sheet. */
export function SettingsPanel() {
  const { compact, doc, tab, setTab } = useWorkshop();
  const dataLabel = dataTabLabel(doc.family);
  const tabs: { id: TabId; label: string }[] = [
    { id: 'vzhled', label: w.tabs.vzhled },
    { id: 'material', label: w.tabs.material },
    { id: 'text', label: w.tabs.text },
    ...(dataLabel ? [{ id: 'data' as const, label: dataLabel }] : []),
  ];
  const active = tab === 'data' && !dataLabel ? 'vzhled' : tab;

  return (
    <div className={compact ? styles.compact : styles.regular}>
      <div className={styles.tabs} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((item) => (
          <button key={item.id} type="button" className={styles.tab} {...pressed(active === item.id)} onClick={() => setTab(item.id)}>
            {compact && <Icon name={TAB_ICONS[item.id] as 'palette'} strokeWidth={1.6} />}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.tabBody}>
        {active === 'vzhled' && <LookTab />}
        {active === 'material' && <MaterialTab />}
        {active === 'text' && <TextTab />}
        {active === 'data' && <DataTab />}
        <ExportSection />
      </div>
    </div>
  );
}

export { TemplatePicker };
