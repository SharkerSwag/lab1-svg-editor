import { StructureEditor } from '../model/StructureEditor.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { SnapshotEdit } from './SnapshotEdit.js';

export class UngroupEdit extends SnapshotEdit {
  constructor(document: SvgDocument, private readonly id: string) { super(document); }

  protected apply(document: SvgDocument): string {
    new StructureEditor(document).ungroup(this.id);
    return `g#${this.id} ungrouped`;
  }
}
