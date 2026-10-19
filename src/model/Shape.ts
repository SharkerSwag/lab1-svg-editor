import type { Group } from './Group.js';
import { Numbers } from './Numbers.js';

export abstract class Shape {
  abstract readonly tag: string;
  private readonly styleValues = new Map<string, string>();
  private readonly presentationValues = new Map<string, string>();
  static readonly presentationNames: ReadonlySet<string> = new Set([
    'font-size', 'font-family', 'font-weight', 'font-style', 'text-anchor', 'xml:space',
  ]);

  protected constructor(
    private readonly identifier: string,
    fill?: string,
    stroke?: string,
  ) {
    if (identifier.length === 0 || /\s/u.test(identifier)) {
      throw new Error('id must be non-empty and contain no whitespace');
    }
    if (fill !== undefined) { this.styleValues.set('fill', fill); }
    if (stroke !== undefined) { this.styleValues.set('stroke', stroke); }
  }

  get id(): string { return this.identifier; }
  get label(): string { return `${this.tag}#${this.id}`; }
  get children(): readonly Shape[] { return []; }
  get text(): string | undefined { return undefined; }
  abstract get geometry(): ReadonlyMap<string, number>;
  abstract get geometrySummary(): string;
  abstract clone(): Shape;

  get styles(): ReadonlyMap<string, string> {
    return new Map(this.styleValues);
  }

  get presentation(): ReadonlyMap<string, string> { return new Map(this.presentationValues); }

  withPresentation(name: string, value: string): Shape {
    if (!Shape.presentationNames.has(name)) { throw new Error(`unsupported presentation attribute: ${name}`); }
    const result = this.clone();
    result.presentationValues.set(name, value);
    return result;
  }

  get summary(): string {
    return [this.label, this.geometrySummary, ...Array.from(this.styles, ([key, value]) => `${key}=${value}`)]
      .filter((part) => part.length !== 0).join(' ');
  }

  asGroup(): Group {
    throw new Error(`not a container: ${this.id}`);
  }

  contains(target: Shape): boolean {
    return this === target || this.children.some((child) => child.contains(target));
  }

  moved(dx: number, dy: number): Shape {
    Numbers.finite(dx, 'dx');
    Numbers.finite(dy, 'dy');
    return this.copyStyles(this.moveGeometry(dx, dy));
  }

  scaled(factor: number): Shape {
    Numbers.positive(factor, 'scale factor');
    return this.copyStyles(this.scaleGeometry(factor));
  }

  withAttribute(name: string, value: string): Shape {
    if (name === 'fill' || name === 'stroke' || name === 'stroke-width') {
      const normalized = name === 'stroke-width' ? String(Numbers.nonNegative(Numbers.parse(value, name), name)) : value;
      const result = this.clone();
      result.styleValues.set(name, normalized);
      return result;
    }
    const geometry = new Map(this.geometry);
    if (!geometry.has(name)) { throw new Error(`unknown attribute: ${name}`); }
    geometry.set(name, Numbers.parse(value, name));
    return this.copyStyles(this.rebuild(geometry));
  }

  protected copyStyles<T extends Shape>(shape: T): T {
    for (const [name, value] of this.styleValues) { shape.styleValues.set(name, value); }
    for (const [name, value] of this.presentationValues) { shape.presentationValues.set(name, value); }
    return shape;
  }

  protected rebuild(_geometry: ReadonlyMap<string, number>): Shape {
    throw new Error('shape has no editable geometry');
  }

  protected abstract moveGeometry(dx: number, dy: number): Shape;
  protected abstract scaleGeometry(factor: number): Shape;
}
