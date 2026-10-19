import type { Group } from './Group.js';
import { Numbers } from './Numbers.js';
import type { Shape } from './Shape.js';

/** Owns its tree and index; all public shape reads return detached copies. */
export class SvgDocument {
  private widthValue: number;
  private heightValue: number;
  private readonly roots: Shape[] = [];
  private readonly index = new Map<string, Shape>();
  private readonly parents = new Map<string, Group | undefined>();

  constructor(width = 800, height = 600) {
    this.widthValue = Numbers.positive(width, 'canvas width');
    this.heightValue = Numbers.positive(height, 'canvas height');
  }

  get width(): number { return this.widthValue; }
  get height(): number { return this.heightValue; }
  get children(): readonly Shape[] { return this.roots.map((shape) => shape.clone()); }
  get size(): number { return this.index.size; }
  has(id: string): boolean { return this.index.has(id); }

  resize(width: number, height: number): void {
    Numbers.positive(width, 'canvas width');
    Numbers.positive(height, 'canvas height');
    this.widthValue = width;
    this.heightValue = height;
  }

  shape(id: string): Shape { return this.lookup(id).clone(); }

  parentOf(id: string): string | undefined {
    this.lookup(id);
    return this.parents.get(id)?.id;
  }

  add(shape: Shape, parentId?: string, position?: number): void {
    const owned = shape.clone();
    const additions = [...this.walk(owned)];
    const ids = new Set<string>();
    for (const node of additions) {
      if (ids.has(node.id) || this.index.has(node.id)) {
        throw new Error(`id already exists: ${node.id}`);
      }
      ids.add(node.id);
    }

    let parent: Group | undefined;
    if (parentId !== undefined) {
      const target = this.index.get(parentId);
      if (target === undefined) { throw new Error(`no such container: ${parentId}`); }
      parent = target.asGroup();
    }

    // All expected validation errors occur before changing the owned tree/index.
    const insertion = position ?? (parent === undefined ? this.roots.length : parent.children.length);
    const length = parent === undefined ? this.roots.length : parent.children.length;
    if (!Number.isInteger(insertion) || insertion < 0 || insertion > length) { throw new Error('invalid child position'); }
    if (parent === undefined) { this.roots.splice(insertion, 0, owned); }
    else { parent.insert(owned, insertion); }
    this.register(owned, parent);
  }

  remove(id: string): void {
    const shape = this.lookup(id);
    const parent = this.parents.get(id);
    if (parent === undefined) {
      this.roots.splice(this.roots.indexOf(shape), 1);
    } else { parent.remove(id); }
    for (const node of this.walk(shape)) {
      this.index.delete(node.id);
      this.parents.delete(node.id);
    }
  }

  positionOf(id: string): number {
    const shape = this.lookup(id);
    const parent = this.parents.get(id);
    return (parent === undefined ? this.roots : parent.children).indexOf(shape);
  }

  replace(id: string, replacement: Shape): void {
    if (replacement.id !== id) { throw new Error('replacement must retain its id'); }
    const candidate = this.clone();
    const parent = candidate.parentOf(id);
    const position = candidate.positionOf(id);
    candidate.remove(id);
    candidate.add(replacement, parent, position);
    this.restore(candidate);
  }

  clone(): SvgDocument {
    const document = new SvgDocument(this.width, this.height);
    for (const shape of this.roots) { document.add(shape); }
    return document;
  }

  restore(snapshot: SvgDocument): void {
    const source = snapshot.clone();
    this.widthValue = source.width;
    this.heightValue = source.height;
    this.roots.splice(0, this.roots.length, ...source.roots);
    this.index.clear();
    this.parents.clear();
    for (const [id, shape] of source.index) { this.index.set(id, shape); }
    for (const [id, parent] of source.parents) { this.parents.set(id, parent); }
  }

  private lookup(id: string): Shape {
    const shape = this.index.get(id);
    if (shape === undefined) { throw new Error(`no such shape: ${id}`); }
    return shape;
  }

  private register(shape: Shape, parent: Group | undefined): void {
    this.index.set(shape.id, shape);
    this.parents.set(shape.id, parent);
    for (const child of shape.children) { this.register(child, shape.asGroup()); }
  }

  private *walk(shape: Shape): Generator<Shape> {
    yield shape;
    for (const child of shape.children) { yield* this.walk(child); }
  }
}
