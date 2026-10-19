import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export class Rect extends Shape {
  readonly tag = 'rect';

  constructor(
    id: string,
    private readonly x: number,
    private readonly y: number,
    private readonly width: number,
    private readonly height: number,
    fill?: string,
  ) {
    super(id, fill);
    Numbers.finite(x, 'x');
    Numbers.finite(y, 'y');
    Numbers.nonNegative(width, 'width');
    Numbers.nonNegative(height, 'height');
  }

  get geometry(): ReadonlyMap<string, number> {
    return new Map([['x', this.x], ['y', this.y], ['width', this.width], ['height', this.height]]);
  }

  get geometrySummary(): string {
    return `x=${this.x} y=${this.y} w=${this.width} h=${this.height}`;
  }

  clone(): Rect {
    return new Rect(this.id, this.x, this.y, this.width, this.height, this.styles.get('fill'));
  }
}
