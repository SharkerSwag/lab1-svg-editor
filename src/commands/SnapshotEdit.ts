import type { SvgDocument } from '../model/SvgDocument.js';
import type { UndoableEdit } from './UndoableEdit.js';

/** Apply to an isolated candidate; only publish it once the whole edit succeeds. */
export abstract class SnapshotEdit implements UndoableEdit {
  private before: SvgDocument | undefined;
  private after: SvgDocument | undefined;
  private message = '';

  constructor(private readonly document: SvgDocument) {}

  execute(): string {
    if (this.after !== undefined) {
      this.document.restore(this.after);
      return this.message;
    }
    const before = this.document.clone();
    const candidate = before.clone();
    const message = this.apply(candidate);
    this.document.restore(candidate);
    this.before = before;
    this.after = candidate;
    this.message = message;
    return message;
  }

  undo(): string {
    if (this.before === undefined) { throw new Error('edit has not been executed'); }
    this.document.restore(this.before);
    return `undone: ${this.message}`;
  }

  protected abstract apply(document: SvgDocument): string;
}
