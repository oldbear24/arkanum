import { useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { ORNAMENTS, shapePath, SYMBOLS } from '../../card/itemArt';
import { PAL, resolveCard } from '../../card/resolve';
import { counts, enums, ranges, textLimits, type ArtFilter, type CardAbility, type CardContent, type CardItem, type CustomColors, type ItemOrnament, type ItemSide, type ItemSymbol } from '../../card/spec';
import { Icon, type IconName } from '../../components/Icon';
import { cs } from '../../i18n/cs';
import { pb } from '../../lib/pb';
import { useWorkshop, type ArtTarget, type TabId } from './context';
import { ADD_ELEMENTS, ARCANAS, ARTS, BACK_PATTERNS, BLANK_OPTION, EDGES, ELEMENTS, FOILS, FONTS, FRAMES, ITEM_ALIGNS, ITEM_FONTS, ITEM_ICONS, ITEM_ORNAMENTS, ITEM_SHAPES, ITEM_SYMBOLS, LAYERS, LAYER_ICONS, PALETTES, SURFACES, VARIANT_OPTIONS, dataTabLabel, itemName, millimetres } from './constants';
import styles from './panels.module.css';

const w = cs.workshop;
const it = w.items;

function cx(...names: (string | false | undefined)[]) {
  return names.filter(Boolean).join(' ');
}

/** What the card shows for an empty field. The fields offer it as their placeholder. */
function useCardFallbacks() {
  const { doc } = useWorkshop();
  const { variant, art, element, palette, foil } = doc.look;
  return useMemo(() => resolveCard({ variant, art, element, palette, foil }), [variant, art, element, palette, foil]);
}

function Section({ title, children, tight }: { title?: string; children: ReactNode; tight?: boolean }) {
  return (
    <section className={cx(styles.section, tight && styles.sectionTight)}>
      {title && <h3 className={styles.heading}>{title}</h3>}
      {children}
    </section>
  );
}

/** Sections that stay open when their tab comes back, the panel rebuilds on every switch. */
const openFoldouts = new Set<string>();

/** A section beyond the basics, which stays out of the way until someone asks for it. */
function Foldout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details
      className={styles.foldout}
      open={openFoldouts.has(title)}
      onToggle={(e) => {
        if (e.currentTarget.open) openFoldouts.add(title);
        else openFoldouts.delete(title);
      }}
    >
      <summary className={styles.foldoutHead}>
        <h3 className={styles.heading}>{title}</h3>
        <Icon name="chevronDown" size={18} />
      </summary>
      <div className={styles.foldoutBody}>{children}</div>
    </details>
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

function SwitchRow({ name, note, on, onToggle }: { name: string; note?: string; on: boolean; onToggle: () => void }) {
  const labelId = useId();
  return (
    <div className={styles.switchRow}>
      <span id={labelId} className={styles.switchLabel}>
        <span className={styles.switchName}>{name}</span>
        {note && <span className={styles.switchNote}>{note}</span>}
      </span>
      <button type="button" role="switch" aria-checked={on} aria-labelledby={labelId} className={styles.switch} onClick={onToggle}>
        <span aria-hidden="true" className={styles.switchTrack} style={{ background: on ? 'var(--gold-track)' : 'var(--option)' }}>
          <span className={styles.switchKnob} style={{ left: on ? 26 : 3 }} />
        </span>
      </button>
    </div>
  );
}

/** A colour of its own, or the one the card has by itself when `value` is empty. */
function ColorField({ label, value, shown, onChange }: { label: string; value: string; shown: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className={styles.colorRow}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={styles.colorControls}>
        {value && (
          <button type="button" className={styles.artIcon} aria-label={w.colorReset + label} onClick={() => onChange('')}>
            <Icon name="undo" size={18} />
          </button>
        )}
        <input id={id} type="color" className={styles.colorInput} value={value || shown} onChange={(e) => onChange(e.target.value)} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- artwork

function ArtRow({ name, url, target, onRemove, extra }: { name: string; url: string; target: ArtTarget; onRemove: () => void; extra?: ReactNode }) {
  const { doc, setPlacement } = useWorkshop();
  const transform = doc.artworkTransform;
  const placement = target === 'main' ? transform : (transform.layers[target] ?? { x: 0, y: 0, zoom: 1, rotate: 0, flipX: false });

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
      <RangeRow label={w.artRotate} value={placement.rotate} display={`${placement.rotate}°`} min={ranges.artRotate[0]} max={ranges.artRotate[1]} step={1} onChange={(rotate) => setPlacement(target, { rotate })} />
      <button type="button" className={styles.uploadQuiet} aria-pressed={placement.flipX} onClick={() => setPlacement(target, { flipX: !placement.flipX })}>
        <Icon name="swap" size={18} />
        {placement.flipX ? w.artUnmirror : w.artMirror}
      </button>
    </div>
  );
}

/** The same file dialog for every image. It stays out of the way of assistive technology. */
function HiddenFileInput({ inputRef, onFile }: { inputRef: RefObject<HTMLInputElement | null>; onFile: (file: File) => void }) {
  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onFile(file);
  };
  return <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className={styles.fileInput} tabIndex={-1} aria-hidden="true" onChange={onChange} />;
}

function FilePicker({ label, onFile, disabled, dashed = true }: { label: string; onFile: (file: File) => void; disabled: boolean; dashed?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className={dashed ? styles.upload : styles.uploadQuiet} disabled={disabled} onClick={() => input.current?.click()}>
        <Icon name="upload" size={18} />
        {label}
      </button>
      <HiddenFileInput inputRef={input} onFile={onFile} />
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
  const { doc, selectedLayer, selectLayer, setLook, selectedItem, showItem, setItem, tab } = useWorkshop();
  const list = LAYERS[doc.family];
  return (
    <ul className={styles.layers}>
      {[...doc.content.elements].reverse().map((item) => {
        const on = tab === 'prvky' && selectedItem === item.id;
        const name = itemName(item);
        return (
          <li key={item.id} className={styles.layer} data-on={on}>
            <button type="button" className={styles.layerPick} style={{ opacity: item.hidden ? 0.5 : 1 }} {...pressed(on)} onClick={() => showItem(item.id)}>
              <Icon name={ITEM_ICONS[item.type]} size={18} strokeWidth={1.6} />
              <span className={styles.layerName}>{name}</span>
            </button>
            <button
              type="button"
              className={styles.layerEye}
              style={{ color: item.hidden ? '#7c759c' : 'var(--text-3)' }}
              aria-label={(item.hidden ? w.showLayer : w.hideLayer) + name}
              onClick={() => setItem(item.id, { hidden: !item.hidden })}
            >
              <Icon name={item.hidden ? 'eyeOff' : 'eye'} size={18} strokeWidth={1.6} />
            </button>
          </li>
        );
      })}
      {list.map((layer) => {
        const canHide = layer.group !== 'base';
        const shown = layer.group === 'base' ? true : doc.look.visible[layer.group];
        const on = tab !== 'prvky' && selectedLayer === layer.id;
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

function ArtAdjustSection() {
  const { doc, setLook } = useWorkshop();
  const { artFilter, fullArt } = doc.look;
  const set = (patch: Partial<ArtFilter>, group: string) => setLook({ artFilter: { ...artFilter, ...patch } }, group);
  const untouched = artFilter.brightness === 100 && artFilter.contrast === 100 && artFilter.saturate === 100 && artFilter.hue === 0;
  return (
    <Foldout title={w.artAdjust}>
      <SwitchRow name={w.fullArt} note={w.fullArtHint} on={fullArt} onToggle={() => setLook({ fullArt: !fullArt })} />
      <RangeRow label={w.artBrightness} value={artFilter.brightness} display={`${artFilter.brightness} %`} min={ranges.artBrightness[0]} max={ranges.artBrightness[1]} step={1} onChange={(brightness) => set({ brightness }, 'art-brightness')} />
      <RangeRow label={w.artContrast} value={artFilter.contrast} display={`${artFilter.contrast} %`} min={ranges.artContrast[0]} max={ranges.artContrast[1]} step={1} onChange={(contrast) => set({ contrast }, 'art-contrast')} />
      <RangeRow label={w.artSaturate} value={artFilter.saturate} display={`${artFilter.saturate} %`} min={ranges.artSaturate[0]} max={ranges.artSaturate[1]} step={1} onChange={(saturate) => set({ saturate }, 'art-saturate')} />
      <RangeRow label={w.artHue} value={artFilter.hue} display={`${artFilter.hue}°`} min={ranges.artHue[0]} max={ranges.artHue[1]} step={1} onChange={(hue) => set({ hue }, 'art-hue')} />
      {!untouched && (
        <button type="button" className={styles.uploadQuiet} onClick={() => setLook({ artFilter: { brightness: 100, contrast: 100, saturate: 100, hue: 0 } })}>
          <Icon name="undo" size={18} />
          {w.artAdjustReset}
        </button>
      )}
    </Foldout>
  );
}

function CustomColorsSection() {
  const { doc, setLook } = useWorkshop();
  const { colors } = doc.look;
  const fallback = useCardFallbacks();
  const color = (slot: keyof CustomColors, label: string, shown: string) => (
    <ColorField key={slot} label={label} value={colors[slot]} shown={shown} onChange={(value) => setLook({ colors: { ...colors, [slot]: value } }, `color-${slot}`)} />
  );
  return (
    <Foldout title={w.customColors}>
      {color('base', w.colorBase, fallback.c.base)}
      {color('sky', w.colorSky, fallback.c.sky0)}
      {color('metal', w.colorMetal, fallback.c.g1)}
      {color('text', w.colorText, fallback.c.txt)}
    </Foldout>
  );
}

function BackSection() {
  const { doc, setLook, setFlip } = useWorkshop();
  const { backPalette, backPattern } = doc.look;
  const fallback = useCardFallbacks();
  // The back is out of sight while the front is on, and a choice needs to show what it does.
  const choose = (patch: Parameters<typeof setLook>[0]) => {
    setFlip(true);
    setLook(patch);
  };
  return (
    <Foldout title={w.backSection}>
      <h4 className={styles.subheading}>{w.backPatternTitle}</h4>
      <div className={styles.grid2}>
        {BACK_PATTERNS.map((pattern) => (
          <button key={pattern.id} type="button" className={styles.optTight} {...pressed(backPattern === pattern.id)} onClick={() => choose({ backPattern: pattern.id })}>
            {pattern.label}
          </button>
        ))}
      </div>
      <h4 className={styles.subheading}>{w.backPalette}</h4>
      <div className={styles.grid4}>
        <button type="button" className={styles.optColumn} {...pressed(backPalette === '')} onClick={() => choose({ backPalette: '' })}>
          <span aria-hidden="true" className={styles.swatchRound} style={{ background: fallback.c.backBase }}>
            <span className={styles.swatchDot} style={{ background: fallback.c.g1 }} />
          </span>
          <span>{w.backSamePalette}</span>
        </button>
        {PALETTES.map((palette) => (
          <button key={palette.id} type="button" className={styles.optColumn} aria-label={`${w.backPalette}: ${palette.label}`} {...pressed(backPalette === palette.id)} onClick={() => choose({ backPalette: palette.id })}>
            <span aria-hidden="true" className={styles.swatchRound} style={{ background: palette.base }}>
              <span className={styles.swatchDot} style={{ background: palette.gold }} />
            </span>
            <span>{palette.label}</span>
          </button>
        ))}
      </div>
    </Foldout>
  );
}

function LookTab() {
  const { compact, doc, setLook, setArt } = useWorkshop();
  const { look } = doc;
  const isTarot = doc.family === 'tarot';
  const isBlank = doc.family === 'prazdna';
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
                onClick={() => setArt(art.id)}
              >
                <span className={styles.optArtNum}>{art.numeral}</span>
                <span>{art.label}</span>
              </button>
            ))}
          </div>
        ) : (
          !compact &&
          !isBlank && (
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

      <ArtAdjustSection />

      {!isTcg && (
        <>
          {!isBlank && (
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
          )}
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

      <CustomColorsSection />

      <Section tight>
        <RangeRow label={w.depth} value={look.depth} display={`${look.depth} %`} min={ranges.depth[0]} max={ranges.depth[1]} step={1} onChange={(depth) => setLook({ depth }, 'depth')} />
      </Section>

      <BackSection />

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
  return (
    <Section title={w.surface}>
      <div className={styles.segments3}>
        {SURFACES.map((surface) => (
          <button key={surface.id} type="button" className={styles.optSegment} {...pressed(look.surface === surface.id)} onClick={() => setLook({ surface: surface.id })}>
            {surface.label}
          </button>
        ))}
      </div>
      <SwitchRow name={w.emboss} note={w.embossHint} on={look.emboss} onToggle={() => setLook({ emboss: !look.emboss })} />
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

/** Only the blank card has a format of its own, the templates have a fixed one. */
function FormatRanges() {
  const { doc, setFormat } = useWorkshop();
  if (doc.family !== 'prazdna') return null;
  return (
    <>
      <RangeRow label={w.formatWidth} value={doc.formatW} display={`${doc.formatW} ${cs.common.mm}`} min={ranges.format[0]} max={ranges.format[1]} step={1} onChange={(formatW) => setFormat(formatW, doc.formatH)} />
      <RangeRow label={w.formatHeight} value={doc.formatH} display={`${doc.formatH} ${cs.common.mm}`} min={ranges.format[0]} max={ranges.format[1]} step={1} onChange={(formatH) => setFormat(doc.formatW, formatH)} />
      <button type="button" className={styles.uploadQuiet} onClick={() => setFormat(doc.formatH, doc.formatW)}>
        <Icon name="swap" size={18} />
        {w.formatSwap}
      </button>
    </>
  );
}

function MaterialTab() {
  const { compact } = useWorkshop();
  if (compact) {
    return (
      <>
        <FoilSection />
        <EdgeSection />
        <Section tight>
          <FormatRanges />
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
        <FormatRanges />
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
  const fallback = useCardFallbacks();
  const subtitle = (value: string) => setContent({ subtitle: value }, 'subtitle');

  return (
    <>
      <Section tight>
        <TextField label={w.cardTitle} value={doc.title} maxLength={textLimits.title} placeholder={fallback.title} onChange={setTitle} />
        {doc.family === 'tarot' && <TextField label={w.numeral} look="display" value={content.numeral} maxLength={textLimits.numeral} placeholder={fallback.numeral} onChange={(numeral) => setContent({ numeral }, 'numeral')} />}
        {doc.family === 'orakulum' && <TextField label={w.message} look="serif" value={content.subtitle} maxLength={40} placeholder={fallback.subtitle} onChange={subtitle} />}
        {doc.family === 'bestie' && <TextField label={w.creatureDescription} look="serif" value={content.subtitle} maxLength={34} placeholder={fallback.subtitle} onChange={subtitle} />}
        {doc.family === 'hrdina' && (
          <>
            <TextField label={w.classRarity} value={content.cls} maxLength={textLimits.cls} placeholder={fallback.cls} onChange={(cls) => setContent({ cls }, 'cls')} />
            <TextArea label={w.quote} italic rows={2} value={content.subtitle} maxLength={textLimits.subtitle} placeholder={fallback.subtitle} onChange={subtitle} />
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
        <RangeRow label={w.titleScale} value={doc.look.titleScale} display={`${doc.look.titleScale} %`} min={ranges.titleScale[0]} max={ranges.titleScale[1]} step={5} onChange={(titleScale) => setLook({ titleScale }, 'title-scale')} />
        <SwitchRow name={w.titleCaps} note={w.titleCapsHint} on={doc.look.titleCaps} onToggle={() => setLook({ titleCaps: !doc.look.titleCaps })} />
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

function AbilityField({ index, ability, title, down, up, effect, namePlaceholder, textPlaceholder }: { index: number; ability: CardAbility; title: string; down: string; up: string; effect: string; namePlaceholder: string; textPlaceholder: string }) {
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
          <input id={id} type="text" className={cx(styles.input, styles.abilityInput)} maxLength={textLimits.abilityName} value={ability.name} placeholder={namePlaceholder} onChange={(e) => setAbility(index, { name: e.target.value }, `ability-${index}`)} />
          <button type="button" className={styles.abilityButton} aria-label={down} onClick={() => power(-10)}>
            <Icon name="minus" size={16} strokeWidth={2} />
          </button>
          <button type="button" className={styles.abilityButton} aria-label={up} onClick={() => power(10)}>
            <Icon name="plusSmall" size={16} strokeWidth={2} />
          </button>
        </div>
      </div>
      <TextField label={effect} look="serif" maxLength={textLimits.abilityText} value={ability.text} placeholder={textPlaceholder} onChange={(text) => setAbility(index, { text }, `ability-text-${index}`)} />
    </>
  );
}

function DataTab() {
  const { doc, record, setMeaning, setContent, setAbility } = useWorkshop();
  const { content, meaning } = doc;
  const fallback = useCardFallbacks();
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
            <AbilityField index={0} ability={first} title={w.firstAbility} down={w.lowerFirst} up={w.raiseFirst} effect={w.firstEffect} namePlaceholder={fallback.ab1} textPlaceholder={fallback.ab1t} />
            <AbilityField index={1} ability={second} title={w.secondAbility} down={w.lowerSecond} up={w.raiseSecond} effect={w.secondEffect} namePlaceholder={fallback.ab2} textPlaceholder={fallback.ab2t} />
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
          <TextField label={w.ability} maxLength={textLimits.abilityName} value={first.name} placeholder={fallback.ab1} onChange={(name) => setAbility(0, { name }, 'ability-0')} />
          <TextArea label={w.abilityEffect} rows={3} maxLength={textLimits.abilityText} value={first.text} placeholder={fallback.ab1t} onChange={(text) => setAbility(0, { text }, 'ability-text-0')} />
        </Section>
      )}

      <Section tight>
        <TextField label={w.setNo} maxLength={textLimits.setNo} value={content.setNo} placeholder={fallback.setNo} onChange={(setNo) => setContent({ setNo }, 'set-no')} />
        {doc.family === 'bestie' && <TextField label={w.artist} maxLength={textLimits.artist} value={content.artist} placeholder={record.expand?.owner ? `@${record.expand.owner.handle}` : fallback.author} onChange={(artist) => setContent({ artist }, 'artist')} />}
      </Section>
    </>
  );
}

// ---------------------------------------------------------------- "Prvky"

/** The buttons of "Přidat prvek". An image first asks for its file. */
export function AddItems() {
  const { uploading, addItem, addImageItem } = useWorkshop();
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className={styles.addGrid}>
      {ADD_ELEMENTS.map(({ type, label, icon }) => (
        <button key={type} type="button" className={styles.addButton} disabled={type === 'image' && uploading} onClick={() => (type === 'image' ? file.current?.click() : addItem(type))}>
          <Icon name={icon} strokeWidth={1.6} />
          <span>{label}</span>
        </button>
      ))}
      <HiddenFileInput inputRef={file} onFile={addImageItem} />
    </div>
  );
}

function ItemPicker<T extends string>({ title, options, value, onPick, draw }: { title: string; options: { id: T; label: string }[]; value: string; onPick: (id: T) => void; draw: (id: T) => ReactNode }) {
  return (
    <>
      <h4 className={styles.subheading}>{title}</h4>
      <div className={styles.iconGrid}>
        {options.map((option) => (
          <button key={option.id} type="button" className={styles.optIcon} aria-label={option.label} title={option.label} {...pressed(value === option.id)} onClick={() => onPick(option.id)}>
            {draw(option.id)}
          </button>
        ))}
      </div>
    </>
  );
}

function SymbolPreview({ id }: { id: ItemSymbol }) {
  return (
    <svg width="26" height="26" viewBox="0 0 100 100" aria-hidden="true">
      <path d={SYMBOLS[id]} fill="currentColor" fillRule="evenodd" />
    </svg>
  );
}

function OrnamentPreview({ id }: { id: ItemOrnament }) {
  const art = ORNAMENTS[id];
  return (
    <svg width="32" height="26" viewBox={`0 0 ${art.w} ${art.h}`} aria-hidden="true">
      {art.line && <path d={art.line} fill="none" stroke="currentColor" strokeWidth={art.w / 40} strokeLinecap="round" />}
      {art.fill && <path d={art.fill} fill="currentColor" />}
    </svg>
  );
}

function ShapePreview({ id }: { id: string }) {
  return (
    <svg width="26" height="26" viewBox="-4 -4 108 108" aria-hidden="true">
      <path d={shapePath(id, 100)} fill="none" stroke="currentColor" strokeWidth={7} strokeLinejoin="round" />
    </svg>
  );
}

function ItemEditor({ item }: { item: CardItem }) {
  const { doc, record, setItem, setFlip, removeItem, duplicateItem, reorderItem } = useWorkshop();
  const items = doc.content.elements;
  const index = items.findIndex((candidate) => candidate.id === item.id);
  const fallback = useCardFallbacks();
  const set = (patch: Partial<CardItem>, group?: string) => setItem(item.id, patch, group && `item-${group}-${item.id}`);
  const ownSize = item.type === 'text' ? [2, 40] : ranges.itemSize;
  const moveToSide = (side: ItemSide) => {
    setFlip(side === 'back');
    set({ side });
  };

  return (
    <Section title={it.properties}>
      <div className={styles.itemActions}>
        <button type="button" className={styles.artIcon} aria-label={it.forward} title={it.forward} disabled={index === items.length - 1} onClick={() => reorderItem(item.id, 1)}>
          <Icon name="chevronUp" size={18} />
        </button>
        <button type="button" className={styles.artIcon} aria-label={it.backward} title={it.backward} disabled={index === 0} onClick={() => reorderItem(item.id, -1)}>
          <Icon name="chevronDown" size={18} />
        </button>
        <button type="button" className={styles.artIcon} aria-label={it.duplicate} title={it.duplicate} disabled={items.length >= counts.elements} onClick={() => duplicateItem(item.id)}>
          <Icon name="copy" size={18} />
        </button>
        <button type="button" className={styles.artIcon} aria-label={it.remove} title={it.remove} onClick={() => removeItem(item.id)}>
          <Icon name="trash" size={18} />
        </button>
      </div>

      {item.type === 'text' && (
        <>
          <TextArea label={it.textField} rows={2} maxLength={textLimits.itemText} value={item.text} onChange={(text) => set({ text }, 'text')} />
          <h4 className={styles.subheading}>{it.font}</h4>
          <div className={styles.grid2}>
            {ITEM_FONTS.map((font) => (
              <button key={font.id} type="button" className={styles.optFont} {...pressed(item.font === font.id)} onClick={() => set({ font: font.id })}>
                <span className={styles.fontSample} style={{ fontFamily: font.family, fontWeight: font.weight, fontStyle: font.italic ? 'italic' : 'normal' }}>
                  {w.fontSample}
                </span>
                <span className={styles.fontName}>{font.label}</span>
              </button>
            ))}
          </div>
          <h4 className={styles.subheading}>{it.align}</h4>
          <div className={styles.segments3}>
            {ITEM_ALIGNS.map((align) => (
              <button key={align.id} type="button" className={styles.optSegment} {...pressed(item.align === align.id)} onClick={() => set({ align: align.id })}>
                {align.label}
              </button>
            ))}
          </div>
        </>
      )}

      {item.type === 'symbol' && <ItemPicker title={it.symbolPick} options={ITEM_SYMBOLS} value={item.kind} onPick={(kind) => set({ kind })} draw={(id) => <SymbolPreview id={id} />} />}
      {item.type === 'ornament' && <ItemPicker title={it.ornamentPick} options={ITEM_ORNAMENTS} value={item.kind} onPick={(kind) => set({ kind })} draw={(id) => <OrnamentPreview id={id} />} />}

      {item.type === 'stat' && (
        <>
          <TextField label={it.statValue} look="display" maxLength={textLimits.itemValue} value={item.value} onChange={(value) => set({ value }, 'value')} />
          <TextField label={it.statLabel} maxLength={textLimits.itemText} value={item.text} onChange={(text) => set({ text }, 'text')} />
          <ItemPicker title={it.badgePick} options={ITEM_SHAPES} value={item.kind} onPick={(kind) => set({ kind })} draw={(id) => <ShapePreview id={id} />} />
        </>
      )}

      {item.type === 'shape' && (
        <>
          <ItemPicker title={it.shapePick} options={ITEM_SHAPES} value={item.kind} onPick={(kind) => set({ kind })} draw={(id) => <ShapePreview id={id} />} />
          <SwitchRow name={it.filled} note={it.filledHint} on={item.filled} onToggle={() => set({ filled: !item.filled })} />
          <RangeRow label={it.ratio} value={item.ratio} display={`${item.ratio} %`} min={ranges.itemRatio[0]} max={ranges.itemRatio[1]} step={5} onChange={(ratio) => set({ ratio }, 'ratio')} />
        </>
      )}

      {item.type === 'image' && !record.itemImages?.includes(item.file) && (
        <p className={styles.error} role="alert">
          {it.imageMissing}
        </p>
      )}

      {item.type !== 'image' && <ColorField label={it.color} value={item.color} shown={item.type === 'text' ? fallback.c.txt : fallback.c.g1} onChange={(color) => set({ color }, 'color')} />}

      <h4 className={styles.subheading}>{it.side}</h4>
      <div className={styles.segments2}>
        {enums.itemSide.map((side) => (
          <button key={side} type="button" className={styles.optSegment} {...pressed(item.side === side)} onClick={() => moveToSide(side)}>
            {it.sides[side]}
          </button>
        ))}
      </div>

      <p className={styles.note}>{it.moveHint}</p>
      <RangeRow label={it.positionX} value={item.x} display={`${Math.round(item.x)} %`} min={ranges.itemPosition[0]} max={ranges.itemPosition[1]} step={1} onChange={(x) => set({ x }, 'x')} />
      <RangeRow label={it.positionY} value={item.y} display={`${Math.round(item.y)} %`} min={ranges.itemPosition[0]} max={ranges.itemPosition[1]} step={1} onChange={(y) => set({ y }, 'y')} />
      <RangeRow label={it.size} value={item.size} display={`${item.size} %`} min={ownSize[0]!} max={ownSize[1]!} step={1} onChange={(size) => set({ size }, 'size')} />
      <RangeRow label={it.rotate} value={item.rotate} display={`${item.rotate}°`} min={ranges.itemRotate[0]} max={ranges.itemRotate[1]} step={1} onChange={(rotate) => set({ rotate }, 'rotate')} />
      <RangeRow label={it.opacity} value={item.opacity} display={`${item.opacity} %`} min={ranges.itemOpacity[0]} max={ranges.itemOpacity[1]} step={1} onChange={(opacity) => set({ opacity }, 'opacity')} />
    </Section>
  );
}

function ItemsTab() {
  const { compact, doc, selectedItem, showItem, uploadError } = useWorkshop();
  const items = doc.content.elements;
  const selected = items.find((item) => item.id === selectedItem);

  return (
    <>
      {compact && (
        <Section title={w.addElement}>
          <AddItems />
        </Section>
      )}
      <Section title={it.onCard}>
        {uploadError && (
          <p className={styles.error} role="alert">
            {uploadError}
          </p>
        )}
        {items.length === 0 ? (
          <p className={styles.note}>{it.empty}</p>
        ) : (
          <ul className={styles.layers}>
            {[...items].reverse().map((item) => (
              <li key={item.id} className={styles.layer} data-on={item.id === selectedItem}>
                <button type="button" className={styles.layerPick} style={{ opacity: item.hidden ? 0.5 : 1 }} {...pressed(item.id === selectedItem)} onClick={() => showItem(item.id)}>
                  <Icon name={ITEM_ICONS[item.type]} size={18} strokeWidth={1.6} />
                  <span className={styles.layerName}>{itemName(item)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>
      {selected && <ItemEditor key={selected.id} item={selected} />}
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

const TAB_ICONS: Record<TabId, IconName> = {
  vzhled: 'palette',
  material: 'sparkle',
  text: 'text',
  data: 'book',
  prvky: 'symbol',
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
    { id: 'prvky', label: w.tabs.prvky },
  ];
  const active = tab === 'data' && !dataLabel ? 'vzhled' : tab;

  return (
    <div className={compact ? styles.compact : styles.regular}>
      <div className={styles.tabs} style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((item) => (
          <button key={item.id} type="button" className={styles.tab} {...pressed(active === item.id)} onClick={() => setTab(item.id)}>
            {compact && <Icon name={TAB_ICONS[item.id]} strokeWidth={1.6} />}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.tabBody}>
        {active === 'vzhled' && <LookTab />}
        {active === 'material' && <MaterialTab />}
        {active === 'text' && <TextTab />}
        {active === 'data' && <DataTab />}
        {active === 'prvky' && <ItemsTab />}
        <ExportSection />
      </div>
    </div>
  );
}

export { TemplatePicker };
