import type { SvgDocument } from '../model/SvgDocument.js';
import { SnapshotEdit } from './SnapshotEdit.js';

export class DeleteEdit extends SnapshotEdit {
  constructor(document: SvgDocument, private readonly id: string) { super(document); }

  protected apply(document: SvgDocument): string {
    const shape = document.shape(this.id);
    document.remove(this.id);
    return `${shape.label} deleted`;
  }
}
