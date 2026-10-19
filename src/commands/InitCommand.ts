import { Numbers } from '../model/Numbers.js';
import { SvgDocument } from '../model/SvgDocument.js';
import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';

export class InitCommand implements Command {
  readonly name = 'init';
  readonly syntax = 'init [w] [h]';

  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    CommandArguments.count(parameters, 0, 2, this.syntax);
    const width = parameters[0] === undefined ? 800 : Numbers.parse(parameters[0], 'canvas width');
    const height = parameters[1] === undefined ? 600 : Numbers.parse(parameters[1], 'canvas height');
    const document = new SvgDocument(width, height);
    this.context.initialize(document);
    return `canvas ${document.width}x${document.height} created`;
  }
}
