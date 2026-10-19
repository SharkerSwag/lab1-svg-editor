import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { GroupEdit } from './GroupEdit.js';

export class GroupCommand implements Command {
  readonly name = 'group';
  readonly syntax = 'group <newGid> <id1> <id2>...';
  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    const document = this.context.document;
    CommandArguments.count(parameters, 3, Infinity, this.syntax);
    return this.context.perform(new GroupEdit(document, parameters[0]!, parameters.slice(1)));
  }
}
