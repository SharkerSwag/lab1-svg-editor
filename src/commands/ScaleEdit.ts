import type { SvgDocument } from '../model/SvgDocument.js';
import { SnapshotEdit } from './SnapshotEdit.js';

export class ScaleEdit extends SnapshotEdit {
  constructor(document: SvgDocument, private readonly id: string, private readonly factor: number) { super(document); }

  protected apply(document: SvgDocument): string {
    const shape = document.shape(this.id);
    document.replace(this.id, shape.scaled(this.factor));
    return `${shape.label} scaled by ${this.factor}`;
  }
}
