import type { CardParams } from '../card/resolve';

// Filled in by phase 7. The workshop already loads this module on demand.

export async function renderThumbnail(_params: CardParams): Promise<Blob> {
  throw new Error('Export is not implemented yet');
}

export async function exportPng(_params: CardParams, _name: string): Promise<void> {
  throw new Error('Export is not implemented yet');
}

export async function exportPdf(_params: CardParams, _name: string, _format: { w: number; h: number }): Promise<void> {
  throw new Error('Export is not implemented yet');
}
