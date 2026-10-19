import { Numbers } from './Numbers.js';
import type { ShapeInput } from './ShapeInput.js';

export class SvgShapeInput implements ShapeInput {
  constructor(private readonly attributes: ReadonlyMap<string, string>, private readonly text: string) {}
  count(_minimum: number, _maximum: number, _syntax: string): void { /* XML uses named attributes, not positional arity. */ }
  number(_index: number, name: string): number {
    const value = (this.attributes.get(name) ?? '0').trim().replace(/px$/u, '');
    return Numbers.parse(value, name);
  }
  optional(_index: number, name: string): string | undefined { return this.attributes.get(name); }
  content(_index: number): string { return this.text; }
}
