import { Shape } from './Shape.js';

export class Group extends Shape {
  readonly tag = 'g';
  private readonly items: Shape[] = [];

  constructor(id: string) { super(id); }

  override get children(): readonly Shape[] { return [...this.items]; }
  get geometry(): ReadonlyMap<string, number> { return new Map(); }
  get geometrySummary(): string { return ''; }
  override asGroup(): Group { return this; }

  insert(shape: Shape, index = this.items.length): void {
    if (!Number.isInteger(index) || index < 0 || index > this.items.length) {
      throw new Error('invalid child position');
    }
    if (shape.contains(this)) {
      throw new Error(`cannot insert a container into its own descendant: ${shape.id}`);
    }
    if (this.items.some((child) => child.id === shape.id)) {
      throw new Error(`id already exists: ${shape.id}`);
    }
    this.items.splice(index, 0, shape);
  }

  remove(id: string): void {
    const index = this.items.findIndex((child) => child.id === id);
    if (index === -1) { throw new Error(`no such shape: ${id}`); }
    this.items.splice(index, 1);
  }

  clone(): Group {
    const group = new Group(this.id);
    for (const child of this.items) { group.insert(child.clone()); }
    return group;
  }
}
