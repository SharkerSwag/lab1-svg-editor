import type { SvgDocument } from '../model/SvgDocument.js';
import { SnapshotEdit } from './SnapshotEdit.js';

export class MoveEdit extends SnapshotEdit {
  constructor(document: SvgDocument, private readonly id: string, private readonly dx: number, private readonly dy: number) {
    super(document);
  }

  protected apply(document: SvgDocument): string {
    const shape = document.shape(this.id);
    document.replace(this.id, shape.moved(this.dx, this.dy));
    return `${shape.label} moved by (${this.dx},${this.dy})`;
  }
}
