import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { AddToEdit } from './AddToEdit.js';

export class AddToCommand implements Command {
  readonly name = 'addto';
  readonly syntax = 'addto <gid> <id>';
  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    const document = this.context.document;
    CommandArguments.count(parameters, 2, 2, this.syntax);
    return this.context.perform(new AddToEdit(document, parameters[0]!, parameters[1]!));
  }
}
