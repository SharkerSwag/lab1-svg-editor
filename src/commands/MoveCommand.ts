import { Numbers } from '../model/Numbers.js';
import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { MoveEdit } from './MoveEdit.js';

export class MoveCommand implements Command {
  readonly name = 'move';
  readonly syntax = 'move <id> <dx> <dy>';
  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    const document = this.context.document;
    CommandArguments.count(parameters, 3, 3, this.syntax);
    return this.context.perform(new MoveEdit(document, parameters[0]!, Numbers.parse(parameters[1]!, 'dx'), Numbers.parse(parameters[2]!, 'dy')));
  }
}
