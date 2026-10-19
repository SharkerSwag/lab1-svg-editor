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
    return this.copyStyles(new Rect(this.id, this.x, this.y, this.width, this.height));
  }

  protected override rebuild(geometry: ReadonlyMap<string, number>): Rect {
    return new Rect(this.id, geometry.get('x')!, geometry.get('y')!, geometry.get('width')!, geometry.get('height')!);
  }

  protected moveGeometry(dx: number, dy: number): Rect {
    return new Rect(this.id, this.x + dx, this.y + dy, this.width, this.height);
  }

  protected scaleGeometry(factor: number): Rect {
    return new Rect(this.id, this.x * factor, this.y * factor, this.width * factor, this.height * factor);
  }
}
