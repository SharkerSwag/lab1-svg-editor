import { Numbers } from './Numbers.js';
import type { ShapeInput } from './ShapeInput.js';

export class CliShapeInput implements ShapeInput {
  constructor(private readonly parameters: readonly string[]) {}
  count(minimum: number, maximum: number, syntax: string): void {
    if (this.parameters.length < minimum || this.parameters.length > maximum) {
      throw new Error(`usage: ${syntax} [in <containerId>]`);
    }
  }
  number(index: number, name: string): number { return Numbers.parse(this.parameters[index]!, name); }
  optional(index: number, _name: string): string | undefined { return this.parameters[index]; }
  content(index: number): string { return this.parameters[index]!; }
}
