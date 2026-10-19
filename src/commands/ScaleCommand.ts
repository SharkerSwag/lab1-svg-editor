import { Numbers } from '../model/Numbers.js';
import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { ScaleEdit } from './ScaleEdit.js';

export class ScaleCommand implements Command {
  readonly name = 'scale';
  readonly syntax = 'scale <id> <factor>';
  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    const document = this.context.document;
    CommandArguments.count(parameters, 2, 2, this.syntax);
    return this.context.perform(new ScaleEdit(document, parameters[0]!, Numbers.parse(parameters[1]!, 'scale factor')));
  }
}
