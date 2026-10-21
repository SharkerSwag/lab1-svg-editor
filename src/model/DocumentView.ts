import type { SvgDocument } from './SvgDocument.js';

/** Read-only session port for presentation adapters. */
export interface DocumentView {
  readonly currentDocument: SvgDocument | undefined;
  readonly associatedPath: string | undefined;
  readonly hasUnsavedChanges: boolean;
}
