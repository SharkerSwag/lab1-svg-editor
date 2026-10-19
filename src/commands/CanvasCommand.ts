import { Numbers } from '../model/Numbers.js';
import type { Command } from './Command.js';
import type { CommandContext } from './CommandContext.js';

export class CanvasCommand implements Command {
  readonly name = 'canvas';
  readonly syntax = 'canvas [w] [h]';

  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    const document = this.context.document;
    if (parameters.length === 0) {
      return `canvas ${document.width}x${document.height}`;
    }
    if (parameters.length !== 2) { throw new Error(`usage: ${this.syntax}`); }
    const width = Numbers.parse(parameters[0]!, 'canvas width');
    const height = Numbers.parse(parameters[1]!, 'canvas height');
    this.context.resizeCanvas(width, height);
    return `canvas resized to ${document.width}x${document.height}`;
  }
}
