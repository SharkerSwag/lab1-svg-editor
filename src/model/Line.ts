import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export class Line extends Shape {
  readonly tag = 'line';

  constructor(
    id: string,
    private readonly x1: number,
    private readonly y1: number,
    private readonly x2: number,
    private readonly y2: number,
    stroke?: string,
  ) {
    super(id, undefined, stroke);
    Numbers.finite(x1, 'x1');
    Numbers.finite(y1, 'y1');
    Numbers.finite(x2, 'x2');
    Numbers.finite(y2, 'y2');
  }

  get geometry(): ReadonlyMap<string, number> {
    return new Map([['x1', this.x1], ['y1', this.y1], ['x2', this.x2], ['y2', this.y2]]);
  }

  get geometrySummary(): string { return `(${this.x1},${this.y1}) -> (${this.x2},${this.y2})`; }

  clone(): Line {
    return this.copyStyles(new Line(this.id, this.x1, this.y1, this.x2, this.y2));
  }

  protected override rebuild(geometry: ReadonlyMap<string, number>): Line {
    return new Line(this.id, geometry.get('x1')!, geometry.get('y1')!, geometry.get('x2')!, geometry.get('y2')!);
  }

  protected moveGeometry(dx: number, dy: number): Line {
    return new Line(this.id, this.x1 + dx, this.y1 + dy, this.x2 + dx, this.y2 + dy);
  }

  protected scaleGeometry(factor: number): Line {
    return new Line(this.id, this.x1 * factor, this.y1 * factor, this.x2 * factor, this.y2 * factor);
  }
}
