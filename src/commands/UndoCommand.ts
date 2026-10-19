import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';

export class UndoCommand implements Command {
  readonly name = 'undo';
  readonly syntax = 'undo';

  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    this.context.document;
    CommandArguments.count(parameters, 0, 0, this.syntax);
    return this.context.undo();
  }
}
