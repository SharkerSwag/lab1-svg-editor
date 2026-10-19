import type { UndoableEdit } from './UndoableEdit.js';

export class History {
  private readonly undoStack: UndoableEdit[] = [];
  private readonly redoStack: UndoableEdit[] = [];
  private blocked = false;

  perform(edit: UndoableEdit): string {
    const result = edit.execute();
    this.undoStack.push(edit);
    this.redoStack.length = 0;
    this.blocked = false;
    return result;
  }

  undo(): string {
    this.checkBarrier();
    const edit = this.undoStack.at(-1);
    if (edit === undefined) { throw new Error('nothing to undo'); }
    const result = edit.undo();
    this.undoStack.pop();
    this.redoStack.push(edit);
    return result;
  }

  redo(): string {
    this.checkBarrier();
    const edit = this.redoStack.at(-1);
    if (edit === undefined) { throw new Error('nothing to redo'); }
    const result = edit.execute();
    this.redoStack.pop();
    this.undoStack.push(edit);
    return result;
  }

  block(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.blocked = true;
  }

  private checkBarrier(): void {
    if (this.blocked) { throw new Error('undo not allowed after io command'); }
  }
}
