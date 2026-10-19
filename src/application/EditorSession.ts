import type { CommandContext } from '../commands/CommandContext.js';
import { History } from '../commands/History.js';
import type { UndoableEdit } from '../commands/UndoableEdit.js';
import type { SvgDocument } from '../model/SvgDocument.js';

export class EditorSession implements CommandContext {
  private current: SvgDocument | undefined;
  private readonly history = new History();

  get document(): SvgDocument {
    if (this.current === undefined) {
      throw new Error("no document. use 'init' or 'read' first");
    }
    return this.current;
  }

  initialize(document: SvgDocument): void {
    this.current = document;
    this.history.block();
  }

  resizeCanvas(width: number, height: number): void {
    this.document.resize(width, height);
    this.history.block();
  }

  perform(edit: UndoableEdit): string {
    this.document;
    return this.history.perform(edit);
  }

  undo(): string {
    this.document;
    return this.history.undo();
  }

  redo(): string {
    this.document;
    return this.history.redo();
  }
}
