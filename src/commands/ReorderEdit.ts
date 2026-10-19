import { StructureEditor } from '../model/StructureEditor.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { SnapshotEdit } from './SnapshotEdit.js';

export class ReorderEdit extends SnapshotEdit {
  constructor(document: SvgDocument, private readonly id: string, private readonly front: boolean) { super(document); }

  protected apply(document: SvgDocument): string {
    const shape = document.shape(this.id);
    new StructureEditor(document).reorder(this.id, this.front);
    return `${shape.label} moved to ${this.front ? 'front' : 'back'}`;
  }
}
