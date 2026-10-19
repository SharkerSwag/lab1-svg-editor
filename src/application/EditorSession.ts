import type { CommandContext } from '../commands/CommandContext.js';
import { History } from '../commands/History.js';
import type { DocumentStorage } from '../model/DocumentStorage.js';
import type { UndoableEdit } from '../commands/UndoableEdit.js';
import type { SvgDocument } from '../model/SvgDocument.js';

export class EditorSession implements CommandContext {
  private current: SvgDocument | undefined;
  private readonly history = new History();
  private filePath: string | undefined;

  constructor(private readonly storage?: DocumentStorage) {}

  get associatedPath(): string | undefined { return this.filePath; }

  get document(): SvgDocument {
    if (this.current === undefined) {
      throw new Error("no document. use 'init' or 'read' first");
    }
    return this.current;
  }

  initialize(document: SvgDocument): void {
    this.current = document;
    this.filePath = undefined;
    this.history.block();
  }

  resizeCanvas(width: number, height: number): void {
    this.document.resize(width, height);
    this.history.block();
  }

  save(file?: string): string {
    const document = this.document;
    const target = file ?? this.filePath;
    if (target === undefined) { throw new Error("no file path. use 'save <file.svg>' first"); }
    if (this.storage === undefined) { throw new Error('document storage is not configured'); }
    this.storage.save(document, target);
    this.filePath = target;
    this.history.block();
    return target;
  }

  read(file: string): readonly string[] {
    if (this.storage === undefined) { throw new Error('document storage is not configured'); }
    const loaded = this.storage.read(file);
    this.current = loaded.document;
    this.filePath = file;
    this.history.block();
    return loaded.warnings;
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
