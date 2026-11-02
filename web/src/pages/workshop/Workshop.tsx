import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import type { CardTurn, ItemEditing } from '../../card/Card3D';
import { itemDefaults, normalizeCard } from '../../card/normalize';
import { counts, ranges, type ArtPlacement, type Art, type CardAbility, type CardContent, type CardDoc, type CardItem, type CardLook, type CardMeaning, type Family, type ItemType } from '../../card/spec';
import { Dialog, ui } from '../../components/ui';
import { cs } from '../../i18n/cs';
import { signInPath, useUser } from '../../lib/auth';
import { artworkLayers, docToParams, placedItems } from '../../lib/cards';
import { cards, isNotFound, templates, type CardRecord } from '../../lib/pb';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { NotFound } from '../NotFound';
import { WorkshopProvider, type ArtTarget, type ExportKind, type TabId, type WorkshopApi } from './context';
import { historyReducer, initHistory } from './history';
import { ShareDialog } from './ShareDialog';
import { applyTemplate, hasEditedTexts } from './templateSwitch';
import { serializeDoc, useAutosave } from './useAutosave';
import { usePresence } from './usePresence';
import { WorkshopDesktop } from './WorkshopDesktop';
import { WorkshopMobile } from './WorkshopMobile';

const EXPAND = 'owner,editors';
const MAX_UPLOAD = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const NO_PLACEMENT: ArtPlacement = { x: 0, y: 0, zoom: 1, rotate: 0, flipX: false };
const PREVIEW_REFRESH_MS = 5000;
/** New items start around the middle of the card, slightly apart to not hide each other. */
const NEW_ITEM_SPREAD = 6;

function uploadProblem(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return cs.workshop.uploadBadType;
  if (file.size > MAX_UPLOAD) return cs.workshop.uploadTooLarge;
  return null;
}

/** The height of an image in percent of its width, so that its box fits it exactly. */
async function imageRatio(file: File): Promise<number> {
  const fallback = itemDefaults('image').ratio;
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = (bitmap.height / bitmap.width) * 100;
    bitmap.close();
    return Math.max(ranges.itemRatio[0], Math.min(ranges.itemRatio[1], Math.round(ratio)));
  } catch {
    return fallback;
  }
}

function newItemId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function clampPosition(value: number): number {
  return Math.round(Math.max(ranges.itemPosition[0], Math.min(ranges.itemPosition[1], value)) * 100) / 100;
}

function Editor({ initial, userId }: { initial: CardRecord; userId: string }) {
  const compact = useMediaQuery('(max-width: 767px)');
  const [record, setRecord] = useState(initial);
  const [history, dispatch] = useReducer(historyReducer<CardDoc>, normalizeCard(initial), initHistory<CardDoc>);
  const doc = history.present;
  const cardId = initial.id;

  const [tab, setTab] = useState<TabId>('vzhled');
  const [selectedLayer, setSelectedLayer] = useState('titulek');
  const [flip, setFlip] = useState(false);
  const [spin, setSpin] = useState(false);
  const [light, setLight] = useState(30);
  const [zoom, setZoom] = useState(100);
  const [resetKey, setResetKey] = useState(0);
  const [turnBy, setTurnBy] = useState<CardTurn | undefined>(undefined);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<Family | null>(null);
  const [deleted, setDeleted] = useState(false);
  const [exporting, setExporting] = useState<ExportKind | null>(null);
  const [exportFailed, setExportFailed] = useState(false);

  const [templateIds, setTemplateIds] = useState<Partial<Record<Family, string>>>({});
  useEffect(() => {
    templates()
      .getFullList({ filter: 'system = true', fields: 'id,family' })
      .then((list) => setTemplateIds(Object.fromEntries(list.map((t) => [t.family, t.id]))))
      .catch(() => undefined);
  }, []);
  const templateId = useCallback((family: Family) => templateIds[family], [templateIds]);

  const docRef = useRef(doc);
  docRef.current = doc;

  const autosave = useAutosave({ cardId, doc, templateId });
  const others = usePresence(cardId, userId);

  // Realtime: changes from co-authors, last write wins.
  const receive = useRef(autosave.receive);
  receive.current = autosave.receive;
  const lastUpdated = useRef(initial.updated);
  useEffect(() => {
    let active = true;
    let stop: (() => Promise<void>) | undefined;
    cards()
      .subscribe(
        cardId,
        (event) => {
          if (event.action === 'delete') {
            setDeleted(true);
            return;
          }
          if (event.record.updated < lastUpdated.current) return;
          lastUpdated.current = event.record.updated;
          setRecord(event.record);

          // The echo of our own save must not touch the history, it would clear the redo steps.
          const remote = normalizeCard(event.record);
          if (receive.current(remote) && serializeDoc(remote) !== serializeDoc(docRef.current)) {
            dispatch({ type: 'replace', value: remote });
          }
        },
        { expand: EXPAND },
      )
      .then((unsubscribe) => {
        if (active) stop = unsubscribe;
        else void unsubscribe();
      })
      .catch(() => undefined);
    return () => {
      active = false;
      void stop?.();
    };
  }, [cardId]);

  const localEdit = useRef(false);
  const change = useCallback((value: CardDoc, group?: string) => {
    localEdit.current = true;
    dispatch({ type: 'change', value, group, at: Date.now() });
  }, []);

  const setTitle = useCallback((title: string) => change({ ...docRef.current, title }, 'title'), [change]);
  const setLook = useCallback((patch: Partial<CardLook>, group?: string) => change({ ...docRef.current, look: { ...docRef.current.look, ...patch } }, group), [change]);
  const setContent = useCallback((patch: Partial<CardContent>, group?: string) => change({ ...docRef.current, content: { ...docRef.current.content, ...patch } }, group), [change]);
  const setMeaning = useCallback((patch: Partial<CardMeaning>, group?: string) => change({ ...docRef.current, meaning: { ...docRef.current.meaning, ...patch } }, group), [change]);
  const setArt = useCallback(
    (art: Art) => {
      // One click, one undo step. The artwork also brings its title and numeral along.
      const current = docRef.current;
      change({
        ...current,
        title: cs.card.arts[art].name,
        look: { ...current.look, art },
        content: { ...current.content, numeral: cs.card.arts[art].numeral },
      });
    },
    [change],
  );
  const setAbility = useCallback(
    (index: number, patch: Partial<CardAbility>, group?: string) => {
      const current = docRef.current;
      const abilities = current.content.abilities.map((ability, i) => (i === index ? { ...ability, ...patch } : ability));
      change({ ...current, content: { ...current.content, abilities } }, group);
    },
    [change],
  );

  const setPlacement = useCallback(
    (target: ArtTarget, patch: Partial<ArtPlacement>) => {
      const current = docRef.current;
      const transform = current.artworkTransform;
      const next =
        target === 'main'
          ? { ...transform, ...patch }
          : { ...transform, layers: transform.layers.map((layer, i) => (i === target ? { ...layer, ...patch } : layer)) };
      change({ ...current, artworkTransform: next }, `placement-${target}-${Object.keys(patch).join()}`);
    },
    [change],
  );

  const setFormat = useCallback((formatW: number, formatH: number) => change({ ...docRef.current, formatW, formatH }, 'format'), [change]);

  const setItems = useCallback(
    (update: (items: CardItem[]) => CardItem[], group?: string) => {
      const current = docRef.current;
      change({ ...current, content: { ...current.content, elements: update(current.content.elements) } }, group);
    },
    [change],
  );

  const setItem = useCallback(
    (id: string, patch: Partial<CardItem>, group?: string) => setItems((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)), group),
    [setItems],
  );

  const flipRef = useRef(flip);
  flipRef.current = flip;

  /** Puts a new item on the side in view, on a card that holds still and faces the user. */
  const placeItem = useCallback(
    (type: ItemType, patch: Partial<CardItem> = {}) => {
      const count = docRef.current.content.elements.length;
      const d = itemDefaults(type);
      const item: CardItem = { ...d, id: newItemId(), type, side: flipRef.current ? 'back' : 'face', y: d.y + ((count % 5) - 2) * NEW_ITEM_SPREAD, ...patch };
      setItems((items) => [...items, item]);
      setSelectedItem(item.id);
      setTab('prvky');
      setSpin(false);
      setResetKey((key) => key + 1);
    },
    [setItems],
  );

  const addItem = useCallback(
    (type: ItemType) => {
      setUploadError(null);
      if (docRef.current.content.elements.length >= counts.elements) {
        setTab('prvky');
        setUploadError(cs.workshop.items.tooManyItems);
        return;
      }
      placeItem(type);
    },
    [placeItem],
  );

  const showItem = useCallback((id: string) => {
    const item = docRef.current.content.elements.find((candidate) => candidate.id === id);
    if (!item) return;
    setSelectedItem(id);
    setTab('prvky');
    setFlip(item.side === 'back');
  }, []);

  const duplicateItem = useCallback(
    (id: string) => {
      const items = docRef.current.content.elements;
      const source = items.find((item) => item.id === id);
      if (!source || items.length >= counts.elements) return;
      const copy = { ...source, id: newItemId(), x: clampPosition(source.x + 4), y: clampPosition(source.y + 4) };
      setItems((list) => list.flatMap((item) => (item.id === id ? [item, copy] : [item])));
      setSelectedItem(copy.id);
    },
    [setItems],
  );

  const reorderItem = useCallback(
    (id: string, delta: number) => {
      setItems((items) => {
        const from = items.findIndex((item) => item.id === id);
        const to = from + delta;
        if (from < 0 || to < 0 || to >= items.length) return items;
        const next = [...items];
        [next[from], next[to]] = [next[to]!, next[from]!];
        return next;
      });
    },
    [setItems],
  );

  const moveItem = useCallback(
    (id: string, dx: number, dy: number) => {
      const item = docRef.current.content.elements.find((candidate) => candidate.id === id);
      if (item) setItem(id, { x: clampPosition(item.x + dx), y: clampPosition(item.y + dy) }, `item-move-${id}`);
    },
    [setItem],
  );

  const itemEditing = useMemo<ItemEditing | undefined>(
    () => (tab === 'prvky' ? { selected: selectedItem, onSelect: setSelectedItem, onMove: moveItem } : undefined),
    [moveItem, selectedItem, tab],
  );

  const requestTemplate = useCallback(
    (family: Family) => {
      const current = docRef.current;
      if (family === current.family) return;
      if (hasEditedTexts(current)) {
        setPendingTemplate(family);
        return;
      }
      setFlip(false);
      change(applyTemplate(current, family));
    },
    [change],
  );

  const selectLayer = useCallback((id: string, target: TabId) => {
    setSelectedLayer(id);
    setTab(target);
  }, []);

  const undo = useCallback(() => {
    localEdit.current = true;
    dispatch({ type: 'undo' });
  }, []);
  const redo = useCallback(() => {
    localEdit.current = true;
    dispatch({ type: 'redo' });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [redo, undo]);

  const uploadTo = useCallback(
    async (field: string, file: File, afterSave?: (saved: CardRecord) => void) => {
      const problem = uploadProblem(file);
      setUploadError(problem);
      if (problem) return;
      setUploading(true);
      try {
        const data = new FormData();
        data.append(field, file);
        const saved = await cards().update(cardId, data, { expand: EXPAND });
        setRecord(saved);
        afterSave?.(saved);
      } catch {
        setUploadError(cs.workshop.uploadFailed);
      } finally {
        setUploading(false);
      }
    },
    [cardId],
  );

  const patchFiles = useCallback(
    async (data: Record<string, unknown>, afterSave?: () => void) => {
      setUploadError(null);
      try {
        const saved = await cards().update(cardId, data, { expand: EXPAND });
        setRecord(saved);
        afterSave?.();
      } catch {
        setUploadError(cs.common.somethingWrong);
      }
    },
    [cardId],
  );

  const setLayerPlacements = useCallback(
    (update: (layers: ArtPlacement[]) => ArtPlacement[]) => {
      const current = docRef.current;
      change({ ...current, artworkTransform: { ...current.artworkTransform, layers: update(current.artworkTransform.layers) } });
    },
    [change],
  );

  const recordRef = useRef(record);
  recordRef.current = record;

  const uploadArtwork = useCallback(
    (file: File) => {
      void uploadTo('artwork', file, () => {
        const current = docRef.current;
        change({ ...current, artworkTransform: { ...current.artworkTransform, ...NO_PLACEMENT } });
      });
    },
    [change, uploadTo],
  );

  const removeArtwork = useCallback(() => {
    void patchFiles({ artwork: null }, () => {
      const current = docRef.current;
      change({ ...current, artworkTransform: { ...current.artworkTransform, ...NO_PLACEMENT } });
    });
  }, [change, patchFiles]);

  const addLayer = useCallback(
    (file: File) => {
      if (recordRef.current.artworkLayers.length >= counts.artworkLayers) return;
      const index = recordRef.current.artworkLayers.length;
      void uploadTo('artworkLayers+', file, () => {
        setLayerPlacements((layers) => {
          const next = layers.slice(0, index);
          while (next.length < index) next.push({ ...NO_PLACEMENT });
          return [...next, { ...NO_PLACEMENT }];
        });
      });
    },
    [setLayerPlacements, uploadTo],
  );

  const removeLayer = useCallback(
    (index: number) => {
      const file = recordRef.current.artworkLayers[index];
      if (!file) return;
      void patchFiles({ 'artworkLayers-': file }, () => setLayerPlacements((layers) => layers.filter((_, i) => i !== index)));
    },
    [patchFiles, setLayerPlacements],
  );

  const moveLayer = useCallback(
    (index: number, delta: number) => {
      const files = [...recordRef.current.artworkLayers];
      const target = index + delta;
      if (target < 0 || target >= files.length) return;
      [files[index], files[target]] = [files[target]!, files[index]!];
      void patchFiles({ artworkLayers: files }, () =>
        setLayerPlacements((layers) => {
          const next = files.map((_, i) => layers[i] ?? { ...NO_PLACEMENT });
          [next[index], next[target]] = [next[target]!, next[index]!];
          return next;
        }),
      );
    },
    [patchFiles, setLayerPlacements],
  );

  const addImageItem = useCallback(
    (file: File) => {
      void (async () => {
        const images = recordRef.current.itemImages ?? [];
        const used = new Set(docRef.current.content.elements.map((item) => item.file));
        // What no item uses comes from an undone step. The new item clears the steps to redo.
        const unused = images.filter((name) => !used.has(name));
        if (images.length - unused.length >= counts.itemImages) {
          setTab('prvky');
          setUploadError(cs.workshop.items.tooManyImages);
          return;
        }
        if (docRef.current.content.elements.length >= counts.elements) {
          setTab('prvky');
          setUploadError(cs.workshop.items.tooManyItems);
          return;
        }
        setTab('prvky');
        if (unused.length > 0 && !uploadProblem(file)) {
          try {
            setRecord(await cards().update(cardId, { 'itemImages-': unused }, { expand: EXPAND }));
          } catch {
            setUploadError(cs.workshop.uploadFailed);
            return;
          }
        }
        const ratio = await imageRatio(file);
        await uploadTo('itemImages+', file, (saved) => {
          const name = (saved.itemImages ?? []).find((candidate) => !images.includes(candidate));
          if (name) placeItem('image', { file: name, ratio });
        });
      })();
    },
    [cardId, placeItem, uploadTo],
  );

  const removeItem = useCallback(
    (id: string) => {
      const items = docRef.current.content.elements;
      const item = items.find((candidate) => candidate.id === id);
      if (!item) return;
      const drop = () => {
        setItems((list) => list.filter((candidate) => candidate.id !== id));
        setSelectedItem((selected) => (selected === id ? null : selected));
      };
      // Like the illustration, an image goes for good. Its file may still serve a copy of the item.
      const lastUse = item.file && !items.some((other) => other.id !== id && other.file === item.file);
      if (lastUse && recordRef.current.itemImages?.includes(item.file)) void patchFiles({ 'itemImages-': item.file }, drop);
      else drop();
    },
    [patchFiles, setItems],
  );

  const params = useMemo(() => {
    const author = record.expand?.owner?.handle;
    return docToParams(doc, { author: author ? `@${author}` : undefined, artwork: artworkLayers(record, doc.artworkTransform), items: placedItems(record, doc) });
  }, [doc, record]);

  const paramsRef = useRef(params);
  paramsRef.current = params;

  const publish = useCallback(() => {
    if (publishing) return;
    setPublishing(true);
    void (async () => {
      await autosave.flush();
      try {
        const data = new FormData();
        data.set('visibility', 'public');
        const { renderThumbnail } = await import('../../export/exportCard');
        data.set('thumbnail', await renderThumbnail(paramsRef.current), 'nahled.png');
        const saved = await cards().update(cardId, data, { expand: EXPAND });
        setRecord(saved);
      } catch {
        // A failed preview must not stop publishing. The gallery can draw the card itself.
        try {
          setRecord(await cards().update(cardId, { visibility: 'public' }, { expand: EXPAND }));
        } catch {
          setShareOpen(true);
        }
      } finally {
        setPublishing(false);
      }
    })();
  }, [autosave, cardId, publishing]);

  // A card that others can see keeps its gallery preview fresh, a moment after the last local edit.
  const previewState = JSON.stringify([normalizeCard(doc), record.artwork, record.artworkLayers, record.itemImages]);
  const previewOf = useRef(previewState);
  const isShared = record.visibility !== 'private';
  useEffect(() => {
    if (!isShared) previewOf.current = previewState;
    if (!isShared || !localEdit.current || previewOf.current === previewState) return undefined;
    const timer = setTimeout(() => {
      previewOf.current = previewState;
      localEdit.current = false;
      void (async () => {
        try {
          const { renderThumbnail } = await import('../../export/exportCard');
          const data = new FormData();
          data.set('thumbnail', await renderThumbnail(paramsRef.current), 'nahled.png');
          setRecord(await cards().update(cardId, data, { expand: EXPAND }));
        } catch {
          // The gallery falls back to the older preview or to drawing the card itself.
        }
      })();
    }, PREVIEW_REFRESH_MS);
    return () => clearTimeout(timer);
  }, [cardId, isShared, previewState]);

  const exportCard = useCallback(
    (kind: ExportKind) => {
      if (exporting) return;
      setExporting(kind);
      setExportFailed(false);
      void (async () => {
        try {
          const { exportPdf, exportPng } = await import('../../export/exportCard');
          const name = docRef.current.title || cs.appName;
          if (kind === 'png') await exportPng(paramsRef.current, name);
          else await exportPdf(paramsRef.current, name, { w: docRef.current.formatW, h: docRef.current.formatH });
        } catch {
          setExportFailed(true);
        } finally {
          setExporting(null);
        }
      })();
    },
    [exporting],
  );

  useEffect(() => {
    document.title = `${doc.title || cs.card.defaults.titleBlank} · ${cs.header.workshop} · ${cs.appName}`;
    return () => {
      document.title = cs.appName;
    };
  }, [doc.title]);

  const api: WorkshopApi = {
    compact,
    doc,
    record,
    params,
    isOwner: record.owner === userId,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    saveState: autosave.state,
    others,
    setTitle,
    setLook,
    setContent,
    setMeaning,
    setArt,
    setAbility,
    setPlacement,
    requestTemplate,
    setFormat,
    selectedItem,
    showItem,
    addItem,
    addImageItem,
    setItem,
    removeItem,
    duplicateItem,
    reorderItem,
    itemEditing,
    tab,
    setTab,
    selectedLayer,
    selectLayer,
    flip,
    setFlip,
    spin,
    toggleSpin: () => setSpin((value) => !value),
    light,
    setLight,
    zoom,
    zoomBy: (delta) => setZoom((value) => Math.max(70, Math.min(140, value + delta))),
    resetKey,
    straighten: () => {
      setResetKey((key) => key + 1);
      setSpin(false);
    },
    turnBy,
    turnCard: setTurnBy,
    uploading,
    uploadError,
    uploadArtwork,
    removeArtwork,
    addLayer,
    removeLayer,
    moveLayer,
    publishing,
    publish,
    openShare: () => setShareOpen(true),
    exporting,
    exportFailed,
    exportCard,
  };

  if (deleted) {
    return (
      <main style={{ padding: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <p className={ui.alert} role="alert">
          {cs.workshop.deleted}
        </p>
        <Link to="/" className={ui.outline}>
          {cs.notFound.back}
        </Link>
      </main>
    );
  }

  return (
    <WorkshopProvider value={api}>
      {compact ? <WorkshopMobile /> : <WorkshopDesktop />}
      {shareOpen && <ShareDialog record={record} isOwner={api.isOwner} onClose={() => setShareOpen(false)} onChange={setRecord} />}
      <Dialog open={pendingTemplate !== null} title={cs.workshop.switchTitle} onClose={() => setPendingTemplate(null)}>
        <p>{cs.workshop.switchText}</p>
        <div className={ui.dialogActions}>
          <button type="button" className={ui.outline} onClick={() => setPendingTemplate(null)}>
            {cs.common.cancel}
          </button>
          <button
            type="button"
            className={ui.primary}
            onClick={() => {
              if (pendingTemplate) {
                setFlip(false);
                change(applyTemplate(docRef.current, pendingTemplate));
              }
              setPendingTemplate(null);
            }}
          >
            {cs.workshop.switchConfirm}
          </button>
        </div>
      </Dialog>
    </WorkshopProvider>
  );
}

/** Loads the card and checks that the user may edit it. */
export function Workshop() {
  const { id = '' } = useParams();
  const location = useLocation();
  const user = useUser();
  const [record, setRecord] = useState<CardRecord | null>(null);
  const [missing, setMissing] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    setRecord(null);
    setMissing(false);
    setFailed(false);
    cards()
      .getOne(id, { expand: EXPAND })
      .then((loaded) => {
        if (active) setRecord(loaded);
      })
      .catch((error) => {
        if (!active) return;
        if (isNotFound(error)) setMissing(true);
        else setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [id, userId, attempt]);

  if (!user) return <Navigate to={signInPath(location.pathname)} replace />;
  if (missing) return <NotFound />;
  if (failed) {
    return (
      <main style={{ padding: 48, textAlign: 'center' }}>
        <p role="alert" style={{ marginBottom: 16 }}>
          {cs.common.somethingWrong}
        </p>
        <button type="button" className={ui.outline} onClick={() => setAttempt((a) => a + 1)}>
          {cs.common.retry}
        </button>
      </main>
    );
  }
  if (!record) return <p className={ui.spinnerRow}>{cs.common.loading}</p>;

  if (record.owner !== user.id && !record.editors.includes(user.id)) {
    return <Navigate to={`/karta/${record.id}`} replace />;
  }

  return <Editor key={record.id} initial={record} userId={user.id} />;
}
