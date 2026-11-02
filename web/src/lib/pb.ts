import PocketBase, { ClientResponseError, type RecordModel } from 'pocketbase';
import type { Family, Visibility } from '../card/spec';

// Same origin in production, proxied by Vite in development.
export const pb = new PocketBase('/');

// Several components may load the same collection at once. Requests are not duplicates.
pb.autoCancellation(false);

export interface UserRecord extends RecordModel {
  handle: string;
  displayName: string;
  avatar: string;
  email?: string;
  verified?: boolean;
}

export interface TemplateRecord extends RecordModel {
  name: string;
  slug: string;
  family: Family;
  formatW: number;
  formatH: number;
  defaults: unknown;
  system: boolean;
  author: string;
  visibility: 'private' | 'public';
}

export interface CardRecord extends RecordModel {
  owner: string;
  title: string;
  template: string;
  family: Family;
  formatW: number;
  formatH: number;
  look: unknown;
  content: unknown;
  meaning: unknown;
  artwork: string;
  artworkLayers: string[];
  artworkTransform: unknown;
  itemImages: string[];
  thumbnail: string;
  visibility: Visibility;
  remixOf: string;
  editors: string[];
  likesCount: number;
  updated: string;
  created: string;
  expand?: {
    owner?: UserRecord;
    editors?: UserRecord[];
    remixOf?: CardRecord;
    template?: TemplateRecord;
  };
}

export interface DeckRecord extends RecordModel {
  owner: string;
  name: string;
  description: string;
  cards: string[];
  back: unknown;
  visibility: Visibility;
  updated: string;
  expand?: {
    owner?: UserRecord;
    cards?: CardRecord[];
  };
}

export interface LikeRecord extends RecordModel {
  user: string;
  card: string;
}

export const users = () => pb.collection<UserRecord>('users');
export const templates = () => pb.collection<TemplateRecord>('templates');
export const cards = () => pb.collection<CardRecord>('cards');
export const decks = () => pb.collection<DeckRecord>('decks');
export const likes = () => pb.collection<LikeRecord>('likes');

export function isNotFound(error: unknown): boolean {
  return error instanceof ClientResponseError && error.status === 404;
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof ClientResponseError && error.status === 0;
}

export { ClientResponseError };
