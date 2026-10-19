import type { Group } from './Group.js';

export abstract class Shape {
  abstract readonly tag: string;

  protected constructor(
    private readonly identifier: string,
    private readonly fillValue?: string,
    private readonly strokeValue?: string,
  ) {
    if (identifier.length === 0 || /\s/u.test(identifier)) {
      throw new Error('id must be non-empty and contain no whitespace');
    }
  }

  get id(): string { return this.identifier; }
  get label(): string { return `${this.tag}#${this.id}`; }
  get children(): readonly Shape[] { return []; }
  get text(): string | undefined { return undefined; }
  abstract get geometry(): ReadonlyMap<string, number>;
  abstract get geometrySummary(): string;
  abstract clone(): Shape;

  get styles(): ReadonlyMap<string, string> {
    const styles = new Map<string, string>();
    if (this.fillValue !== undefined) { styles.set('fill', this.fillValue); }
    if (this.strokeValue !== undefined) { styles.set('stroke', this.strokeValue); }
    return styles;
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
}
