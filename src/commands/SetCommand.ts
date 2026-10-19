import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { SetEdit } from './SetEdit.js';

export class SetCommand implements Command {
  readonly name = 'set';
  readonly syntax = 'set <id> <attr> <value>';
  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    const document = this.context.document;
    CommandArguments.count(parameters, 3, 3, this.syntax);
    return this.context.perform(new SetEdit(document, parameters[0]!, parameters[1]!, parameters[2]!));
  }
}
