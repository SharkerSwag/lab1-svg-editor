import { StructureEditor } from '../model/StructureEditor.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { SnapshotEdit } from './SnapshotEdit.js';

export class GroupEdit extends SnapshotEdit {
  constructor(document: SvgDocument, private readonly id: string, private readonly ids: readonly string[]) { super(document); }

  protected apply(document: SvgDocument): string {
    new StructureEditor(document).group(this.id, this.ids);
    return `g#${this.id} created with ${this.ids.length} children`;
  }
}
