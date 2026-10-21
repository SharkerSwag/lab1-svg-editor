import type { DocumentView } from '../model/DocumentView.js';
import type { Shape } from '../model/Shape.js';
import { SvgSerializer } from './SvgSerializer.js';

export class PreviewSnapshot {
  constructor(private readonly view: DocumentView, private readonly serializer = new SvgSerializer()) {}

  capture(): string {
    const document = this.view.currentDocument;
    const state = {
      path: this.view.associatedPath ?? null,
      dirty: this.view.hasUnsavedChanges,
      width: document?.width ?? 0, height: document?.height ?? 0, count: document?.size ?? 0,
      tree: document === undefined ? [] : this.describe(document.children),
      svg: '', error: '',
    };
    if (document !== undefined) {
      try { state.svg = this.serializer.serialize(document); }
      catch (error: unknown) { state.error = error instanceof Error ? error.message : 'cannot render SVG'; }
    }
    return JSON.stringify(state);
  }

  private describe(shapes: readonly Shape[]): unknown[] {
    return shapes.map((shape) => ({
      id: shape.id, tag: shape.tag, summary: shape.summary, children: this.describe(shape.children),
    }));
  }
}
