import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Group } from './Group.js';
import { Line } from './Line.js';
import { Numbers } from './Numbers.js';
import { Rect } from './Rect.js';
import type { Shape } from './Shape.js';
import { Text } from './Text.js';

/** The only location that dispatches by shape type name. */
export class ShapeFactory {
  create(type: string, id: string, parameters: readonly string[]): Shape {
    const number = (index: number, name: string): number => Numbers.parse(parameters[index]!, name);
    switch (type) {
      case 'rect':
        this.requireCount(parameters, 4, 5, 'create rect <id> <x> <y> <w> <h> [fill]');
        return new Rect(id, number(0, 'x'), number(1, 'y'), number(2, 'width'), number(3, 'height'), parameters[4]);
      case 'circle':
        this.requireCount(parameters, 3, 4, 'create circle <id> <cx> <cy> <r> [fill]');
        return new Circle(id, number(0, 'cx'), number(1, 'cy'), number(2, 'r'), parameters[3]);
      case 'ellipse':
        this.requireCount(parameters, 4, 5, 'create ellipse <id> <cx> <cy> <rx> <ry> [fill]');
        return new Ellipse(id, number(0, 'cx'), number(1, 'cy'), number(2, 'rx'), number(3, 'ry'), parameters[4]);
      case 'line':
        this.requireCount(parameters, 4, 5, 'create line <id> <x1> <y1> <x2> <y2> [stroke]');
        return new Line(id, number(0, 'x1'), number(1, 'y1'), number(2, 'x2'), number(3, 'y2'), parameters[4]);
      case 'text':
        this.requireCount(parameters, 3, 3, 'create text <id> <x> <y> "content"');
        return new Text(id, number(0, 'x'), number(1, 'y'), parameters[2]!);
      case 'g':
        this.requireCount(parameters, 0, 0, 'create g <id>');
        return new Group(id);
      default:
        throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
  }

  private requireCount(parameters: readonly string[], minimum: number, maximum: number, syntax: string): void {
    if (parameters.length < minimum || parameters.length > maximum) {
      throw new Error(`usage: ${syntax} [in <containerId>]`);
    }
  }
}
