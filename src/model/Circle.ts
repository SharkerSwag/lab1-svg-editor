import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export class Circle extends Shape {
  readonly tag = 'circle';

  constructor(id: string, private readonly cx: number, private readonly cy: number, private readonly r: number, fill?: string) {
    super(id, fill);
    Numbers.finite(cx, 'cx');
    Numbers.finite(cy, 'cy');
    Numbers.nonNegative(r, 'r');
  }

  get geometry(): ReadonlyMap<string, number> {
    return new Map([['cx', this.cx], ['cy', this.cy], ['r', this.r]]);
  }

  get geometrySummary(): string { return `cx=${this.cx} cy=${this.cy} r=${this.r}`; }

  clone(): Circle {
    return new Circle(this.id, this.cx, this.cy, this.r, this.styles.get('fill'));
  }
}
