import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export class Text extends Shape {
  readonly tag = 'text';

  constructor(id: string, private readonly x: number, private readonly y: number, private readonly content: string) {
    super(id);
    Numbers.finite(x, 'x');
    Numbers.finite(y, 'y');
  }

  override get text(): string { return this.content; }

  get geometry(): ReadonlyMap<string, number> {
    return new Map([['x', this.x], ['y', this.y]]);
  }

  get geometrySummary(): string { return `(${this.x},${this.y}) ${JSON.stringify(this.content)}`; }

  clone(): Text { return new Text(this.id, this.x, this.y, this.content); }
}
