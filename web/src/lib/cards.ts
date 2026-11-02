import { normalizeCard } from '../card/normalize';
import type { ArtLayer, CardParams } from '../card/resolve';
import { templateFor, type ArtworkTransform, type CardDoc, type Family, type TemplateDefaults } from '../card/spec';
import { cards, pb, templates, type CardRecord, type TemplateRecord, type UserRecord } from './pb';

export const GALLERY_PAGE_SIZE = 24;

export type GalleryFilter = 'vse' | 'tarot' | 'bestie' | 'hrdina' | 'orakulum';
export type GallerySort = 'nove' | 'oblibene';

export function galleryFilterExpression(filter: GalleryFilter, query: string): string {
  const parts = ['visibility = "public"'];
  if (filter !== 'vse') parts.push(pb.filter('family = {:family}', { family: filter }));
  const q = query.trim();
  if (q) parts.push(pb.filter('title ~ {:q}', { q }));
  return parts.join(' && ');
}

export function gallerySortExpression(sort: GallerySort): string {
  return sort === 'oblibene' ? '-likesCount,-created' : '-created';
}

export async function fetchGalleryPage(filter: GalleryFilter, sort: GallerySort, query: string, page: number) {
  const result = await cards().getList(page, GALLERY_PAGE_SIZE, {
    filter: galleryFilterExpression(filter, query),
    sort: gallerySortExpression(sort),
    expand: 'owner',
    skipTotal: true,
  });
  return { items: result.items, hasMore: result.items.length === GALLERY_PAGE_SIZE };
}

export function artworkLayers(record: Pick<CardRecord, 'id' | 'collectionId' | 'collectionName' | 'artwork' | 'artworkLayers'>, transform: ArtworkTransform): ArtLayer[] {
  const url = (file: string) => pb.files.getURL(record, file);
  if (record.artworkLayers?.length) {
    return record.artworkLayers.map((file, i) => ({ url: url(file), x: 0, y: 0, zoom: 1, ...transform.layers[i] }));
  }
  if (record.artwork) {
    return [{ url: url(record.artwork), x: transform.x, y: transform.y, zoom: transform.zoom }];
  }
  return [];
}

export function docToParams(doc: CardDoc, options: { author?: string; artwork?: ArtLayer[] } = {}): CardParams {
  const { look, content } = doc;
  const [first, second] = content.abilities;
  return {
    variant: look.variant,
    art: look.art,
    frame: look.frame,
    palette: look.palette,
    element: look.element,
    foil: look.foil,
    foilI: look.foilI,
    surface: look.surface,
    emboss: look.emboss,
    edge: look.edge,
    thick: look.thick,
    radius: look.radius,
    depth: look.depth,
    font: look.font,
    showArt: look.visible.art,
    showFrame: look.visible.frame,
    showText: look.visible.text,
    showFoil: look.visible.foil,
    cardTitle: doc.title,
    numeral: content.numeral,
    subtitle: content.subtitle,
    cls: content.cls,
    hp: content.hp,
    level: content.level,
    cost: content.cost,
    s1: content.s1,
    s2: content.s2,
    s3: content.s3,
    rarity: content.rarity,
    setNo: content.setNo,
    ab1: first?.name,
    ab1p: first?.power,
    ab1t: first?.text,
    ab2: second?.name,
    ab2p: second?.power,
    ab2t: second?.text,
    author: options.author,
    artwork: options.artwork,
    formatW: doc.formatW,
    formatH: doc.formatH,
  };
}

export function authorOf(record: CardRecord): string | undefined {
  const handle = record.expand?.owner?.handle;
  return handle ? `@${handle}` : undefined;
}

/** Card parameters of a stored card, ready for Card3D, CardFace or LazyCard. */
export function recordToParams(record: CardRecord): CardParams {
  const doc = normalizeCard(record);
  return docToParams(doc, { author: authorOf(record), artwork: artworkLayers(record, doc.artworkTransform) });
}

export function thumbnailUrl(record: CardRecord): string | undefined {
  return record.thumbnail ? pb.files.getURL(record, record.thumbnail) : undefined;
}

export function displayName(user: Pick<UserRecord, 'displayName' | 'handle'>): string {
  return user.displayName || user.handle;
}

export function avatarUrl(user: UserRecord, thumb = '96x96'): string | undefined {
  return user.avatar ? pb.files.getURL(user, user.avatar, { thumb }) : undefined;
}

/** Copies a card into the user's cards, artwork included. The copy starts as private. */
export async function remixCard(source: CardRecord, owner: string): Promise<CardRecord> {
  const data = new FormData();
  data.set('owner', owner);
  data.set('remixOf', source.id);
  data.set('title', source.title);
  data.set('family', source.family);
  data.set('formatW', String(source.formatW));
  data.set('formatH', String(source.formatH));
  data.set('visibility', 'private');
  if (source.template) data.set('template', source.template);
  for (const field of ['look', 'content', 'meaning', 'artworkTransform'] as const) {
    data.set(field, JSON.stringify(source[field] ?? null));
  }

  const copy = async (field: string, file: string) => {
    const response = await fetch(pb.files.getURL(source, file));
    if (!response.ok) throw new Error(`Cannot read ${file}`);
    data.append(field, await response.blob(), file);
  };
  if (source.artwork) await copy('artwork', source.artwork);
  for (const file of source.artworkLayers ?? []) await copy('artworkLayers', file);

  return cards().create(data);
}

/** Loads the system template of a family. The local copy is only used for its fields. */
export async function fetchTemplate(family: Family): Promise<TemplateRecord> {
  const slug = templateFor(family).slug;
  return templates().getFirstListItem(pb.filter('slug = {:slug} && system = true', { slug }));
}

export interface NewCardInput {
  owner: string;
  template: TemplateRecord;
  format?: { w: number; h: number };
}

export async function createCardFromTemplate({ owner, template, format }: NewCardInput): Promise<CardRecord> {
  const defaults = template.defaults as TemplateDefaults;
  return cards().create({
    owner,
    template: template.id,
    title: defaults.title,
    family: template.family,
    formatW: format?.w ?? template.formatW,
    formatH: format?.h ?? template.formatH,
    look: defaults.look,
    content: defaults.content,
    meaning: defaults.meaning,
    visibility: 'private',
  });
}
