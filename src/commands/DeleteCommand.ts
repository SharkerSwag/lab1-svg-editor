import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { DeleteEdit } from './DeleteEdit.js';

export class DeleteCommand implements Command {
  readonly name = 'delete';
  readonly syntax = 'delete <id>';
  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    const document = this.context.document;
    CommandArguments.count(parameters, 1, 1, this.syntax);
    return this.context.perform(new DeleteEdit(document, parameters[0]!));
  }
}
