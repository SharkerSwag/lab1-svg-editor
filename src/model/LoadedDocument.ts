import type { SvgDocument } from './SvgDocument.js';

export interface LoadedDocument {
  readonly document: SvgDocument;
  readonly warnings: readonly string[];
}
