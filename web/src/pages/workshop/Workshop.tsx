import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { normalizeCard } from '../../card/normalize';
import { counts, type ArtPlacement, type CardAbility, type CardContent, type CardDoc, type CardLook, type CardMeaning, type Family } from '../../card/spec';
import { Dialog, ui } from '../../components/ui';
import { cs } from '../../i18n/cs';
import { signInPath, useUser } from '../../lib/auth';
import { artworkLayers, docToParams } from '../../lib/cards';
import { cards, isNotFound, templates, type CardRecord } from '../../lib/pb';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { NotFound } from '../NotFound';
import { WorkshopProvider, type ArtTarget, type ExportKind, type TabId, type WorkshopApi } from './context';
import { historyReducer, initHistory } from './history';
import { ShareDialog } from './ShareDialog';
import { applyTemplate, hasEditedTexts } from './templateSwitch';
import { useAutosave } from './useAutosave';
import { usePresence } from './usePresence';
import { WorkshopDesktop } from './WorkshopDesktop';
import { WorkshopMobile } from './WorkshopMobile';

const EXPAND = 'owner,editors';
const MAX_UPLOAD = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const NO_PLACEMENT: ArtPlacement = { x: 0, y: 0, zoom: 1 };

function uploadProblem(file: File): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return cs.workshop.uploadBadType;
  if (file.size > MAX_UPLOAD) return cs.workshop.uploadTooLarge;
  return null;
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

          const remote = normalizeCard(event.record);
          if (receive.current(remote)) dispatch({ type: 'replace', value: remote });
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

  const change = useCallback((value: CardDoc, group?: string) => dispatch({ type: 'change', value, group, at: Date.now() }), []);

  const docRef = useRef(doc);
  docRef.current = doc;

  const setTitle = useCallback((title: string) => change({ ...docRef.current, title }, 'title'), [change]);
  const setLook = useCallback((patch: Partial<CardLook>, group?: string) => change({ ...docRef.current, look: { ...docRef.current.look, ...patch } }, group), [change]);
  const setContent = useCallback((patch: Partial<CardContent>, group?: string) => change({ ...docRef.current, content: { ...docRef.current.content, ...patch } }, group), [change]);
  const setMeaning = useCallback((patch: Partial<CardMeaning>, group?: string) => change({ ...docRef.current, meaning: { ...docRef.current.meaning, ...patch } }, group), [change]);
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

  const undo = useCallback(() => dispatch({ type: 'undo' }), []);
  const redo = useCallback(() => dispatch({ type: 'redo' }), []);

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
    async (field: string, file: File, afterSave?: () => void) => {
      const problem = uploadProblem(file);
      setUploadError(problem);
      if (problem) return;
      setUploading(true);
      try {
        const data = new FormData();
        data.append(field, file);
        const saved = await cards().update(cardId, data, { expand: EXPAND });
        setRecord(saved);
        afterSave?.();
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

  const params = useMemo(() => {
    const author = record.expand?.owner?.handle;
    return docToParams(doc, { author: author ? `@${author}` : undefined, artwork: artworkLayers(record, doc.artworkTransform) });
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
    setAbility,
    setPlacement,
    requestTemplate,
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
      <main style={{ padding: 48, textAlign: 'center' }}>
        <p className={ui.alert} role="alert">
          {cs.workshop.deleted}
        </p>
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
