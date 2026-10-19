import type { Shape } from '../model/Shape.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import type { UndoableEdit } from './UndoableEdit.js';

export class CreateShapeEdit implements UndoableEdit {
  private readonly shape: Shape;

  constructor(private readonly document: SvgDocument, shape: Shape, private readonly parentId?: string) {
    this.shape = shape.clone();
  }

  execute(): string {
    this.document.add(this.shape, this.parentId);
    const location = this.parentId === undefined ? '' : ` in g#${this.parentId}`;
    return `${this.shape.label} created${location}`;
  }

  undo(): string {
    this.document.remove(this.shape.id);
    return `${this.shape.label} creation undone`;
  }
}
