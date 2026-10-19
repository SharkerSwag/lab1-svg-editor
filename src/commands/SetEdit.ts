import type { SvgDocument } from '../model/SvgDocument.js';
import { SnapshotEdit } from './SnapshotEdit.js';

export class SetEdit extends SnapshotEdit {
  constructor(document: SvgDocument, private readonly id: string, private readonly attribute: string, private readonly value: string) {
    super(document);
  }

  protected apply(document: SvgDocument): string {
    const shape = document.shape(this.id);
    document.replace(this.id, shape.withAttribute(this.attribute, this.value));
    return `${shape.label} updated: ${this.attribute}=${JSON.stringify(this.value)}`;
  }
}
