import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { ReorderEdit } from './ReorderEdit.js';

export class BackCommand implements Command {
  readonly name = 'back';
  readonly syntax = 'back <id>';
  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    const document = this.context.document;
    CommandArguments.count(parameters, 1, 1, this.syntax);
    return this.context.perform(new ReorderEdit(document, parameters[0]!, false));
  }
}
