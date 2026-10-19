import { Numbers } from './Numbers.js';
import { Shape } from './Shape.js';

export class Ellipse extends Shape {
  readonly tag = 'ellipse';

  constructor(
    id: string,
    private readonly cx: number,
    private readonly cy: number,
    private readonly rx: number,
    private readonly ry: number,
    fill?: string,
  ) {
    super(id, fill);
    Numbers.finite(cx, 'cx');
    Numbers.finite(cy, 'cy');
    Numbers.nonNegative(rx, 'rx');
    Numbers.nonNegative(ry, 'ry');
  }

  get geometry(): ReadonlyMap<string, number> {
    return new Map([['cx', this.cx], ['cy', this.cy], ['rx', this.rx], ['ry', this.ry]]);
  }

  get geometrySummary(): string { return `cx=${this.cx} cy=${this.cy} rx=${this.rx} ry=${this.ry}`; }

  clone(): Ellipse {
    return this.copyStyles(new Ellipse(this.id, this.cx, this.cy, this.rx, this.ry));
  }

  protected override rebuild(geometry: ReadonlyMap<string, number>): Ellipse {
    return new Ellipse(this.id, geometry.get('cx')!, geometry.get('cy')!, geometry.get('rx')!, geometry.get('ry')!);
  }

  protected moveGeometry(dx: number, dy: number): Ellipse {
    return new Ellipse(this.id, this.cx + dx, this.cy + dy, this.rx, this.ry);
  }

  protected scaleGeometry(factor: number): Ellipse {
    return new Ellipse(this.id, this.cx * factor, this.cy * factor, this.rx * factor, this.ry * factor);
  }
}
