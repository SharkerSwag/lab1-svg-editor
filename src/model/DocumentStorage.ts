import type { SvgDocument } from './SvgDocument.js';
import type { LoadedDocument } from './LoadedDocument.js';

export interface DocumentStorage {
  save(document: SvgDocument, file: string): void;
  read(file: string): LoadedDocument;
}
