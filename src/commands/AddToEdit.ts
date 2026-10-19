import { StructureEditor } from '../model/StructureEditor.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { SnapshotEdit } from './SnapshotEdit.js';

export class AddToEdit extends SnapshotEdit {
  constructor(document: SvgDocument, private readonly groupId: string, private readonly id: string) { super(document); }

  protected apply(document: SvgDocument): string {
    const shape = document.shape(this.id);
    new StructureEditor(document).addTo(this.groupId, this.id);
    return `${shape.label} added to g#${this.groupId}`;
  }
}
