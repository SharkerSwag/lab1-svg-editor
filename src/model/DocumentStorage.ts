import type { SvgDocument } from './SvgDocument.js';

export interface DocumentStorage {
  save(document: SvgDocument, file: string): void;
}
