export interface UndoableEdit {
  execute(): string;
  undo(): string;
}
