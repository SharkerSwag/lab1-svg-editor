import { Circle } from './Circle.js';
import { CliShapeInput } from './CliShapeInput.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import type { ShapeInput } from './ShapeInput.js';
import { SvgShapeInput } from './SvgShapeInput.js';
import { Text } from './Text.js';

/** The only location that dispatches by shape type name. */
export class ShapeFactory {
  create(type: string, id: string, parameters: readonly string[]): Shape {
    return this.construct(type, id, new CliShapeInput(parameters));
  }

  fromSvg(type: string, id: string, attributes: ReadonlyMap<string, string>, text: string): Shape {
    let shape = this.construct(type, id, new SvgShapeInput(attributes, text));
    for (const name of ['fill', 'stroke', 'stroke-width']) {
      const value = attributes.get(name);
      if (value !== undefined) { shape = shape.withAttribute(name, name === 'stroke-width' ? value.trim().replace(/px$/u, '') : value); }
    }
    return shape;
  }

  private construct(type: string, id: string, input: ShapeInput): Shape {
    const number = (index: number, name: string): number => input.number(index, name);
    switch (type) {
      case 'rect':
        input.count(4, 5, 'create rect <id> <x> <y> <w> <h> [fill]');
        return new Rect(id, number(0, 'x'), number(1, 'y'), number(2, 'width'), number(3, 'height'), input.optional(4, 'fill'));
      case 'circle':
        input.count(3, 4, 'create circle <id> <cx> <cy> <r> [fill]');
        return new Circle(id, number(0, 'cx'), number(1, 'cy'), number(2, 'r'), input.optional(3, 'fill'));
      case 'ellipse':
        input.count(4, 5, 'create ellipse <id> <cx> <cy> <rx> <ry> [fill]');
        return new Ellipse(id, number(0, 'cx'), number(1, 'cy'), number(2, 'rx'), number(3, 'ry'), input.optional(4, 'fill'));
      case 'line':
        input.count(4, 5, 'create line <id> <x1> <y1> <x2> <y2> [stroke]');
        return new Line(id, number(0, 'x1'), number(1, 'y1'), number(2, 'x2'), number(3, 'y2'), input.optional(4, 'stroke'));
      case 'text':
        input.count(3, 3, 'create text <id> <x> <y> "content"');
        return new Text(id, number(0, 'x'), number(1, 'y'), input.content(2));
      case 'g':
        input.count(0, 0, 'create g <id>');
        return new Group(id);
      default:
        throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

}
