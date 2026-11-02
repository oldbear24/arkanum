import { createContext, useContext } from 'react';
import type { CardTurn, ItemEditing } from '../../card/Card3D';
import type { CardParams } from '../../card/resolve';
import type { ArtPlacement, Art, CardAbility, CardContent, CardDoc, CardItem, CardLook, CardMeaning, Family, ItemType } from '../../card/spec';
import type { CardRecord } from '../../lib/pb';
import type { SaveState } from './useAutosave';
import type { PresenceUser } from './usePresence';

export type TabId = 'vzhled' | 'material' | 'text' | 'data' | 'prvky';

/** The main illustration, or the index of a parallax layer. */
export type ArtTarget = 'main' | number;

export type ExportKind = 'png' | 'pdf';

export interface WorkshopApi {
  compact: boolean;
  doc: CardDoc;
  record: CardRecord;
  params: CardParams;
  isOwner: boolean;

  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  saveState: SaveState;
  others: PresenceUser[];

  setTitle: (title: string) => void;
  setLook: (patch: Partial<CardLook>, group?: string) => void;
  setContent: (patch: Partial<CardContent>, group?: string) => void;
  setMeaning: (patch: Partial<CardMeaning>, group?: string) => void;
  setArt: (art: Art) => void;
  setAbility: (index: number, patch: Partial<CardAbility>, group?: string) => void;
  setPlacement: (target: ArtTarget, patch: Partial<ArtPlacement>) => void;
  requestTemplate: (family: Family) => void;
  setFormat: (formatW: number, formatH: number) => void;

  selectedItem: string | null;
  /** Picks an item in a list, and turns the card to the side the item is on. */
  showItem: (id: string) => void;
  addItem: (type: ItemType) => void;
  addImageItem: (file: File) => void;
  setItem: (id: string, patch: Partial<CardItem>, group?: string) => void;
  removeItem: (id: string) => void;
  duplicateItem: (id: string) => void;
  reorderItem: (id: string, delta: number) => void;
  /** What the card on the stage needs for picking and moving items, while their tab is open. */
  itemEditing: ItemEditing | undefined;

  tab: TabId;
  setTab: (tab: TabId) => void;
  selectedLayer: string;
  selectLayer: (id: string, tab: TabId) => void;
  flip: boolean;
  setFlip: (flip: boolean) => void;
  spin: boolean;
  toggleSpin: () => void;
  unlocked: boolean;
  toggleUnlocked: () => void;
  light: number;
  setLight: (light: number) => void;
  zoom: number;
  zoomBy: (delta: number) => void;
  resetKey: number;
  straighten: () => void;
  turnBy: CardTurn | undefined;
  turnCard: (turn: CardTurn) => void;

  uploading: boolean;
  uploadError: string | null;
  uploadArtwork: (file: File) => void;
  removeArtwork: () => void;
  addLayer: (file: File) => void;
  removeLayer: (index: number) => void;
  moveLayer: (index: number, delta: number) => void;

  publishing: boolean;
  publish: () => void;
  openShare: () => void;

  exporting: ExportKind | null;
  exportFailed: boolean;
  exportCard: (kind: ExportKind) => void;
}

const Context = createContext<WorkshopApi | null>(null);

export const WorkshopProvider = Context.Provider;

export function useWorkshop(): WorkshopApi {
  const api = useContext(Context);
  if (!api) throw new Error('useWorkshop must be used inside of the workshop');
  return api;
}
