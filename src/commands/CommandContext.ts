import type { SvgDocument } from '../model/SvgDocument.js';
import type { UndoableEdit } from './UndoableEdit.js';

/** Implemented by the application layer; commands do not import that layer. */
export interface CommandContext {
  readonly document: SvgDocument;
  initialize(document: SvgDocument): void;
  resizeCanvas(width: number, height: number): void;
  save(file?: string): string;
  perform(edit: UndoableEdit): string;
  undo(): string;
  redo(): string;
}
