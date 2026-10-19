import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';

export class RedoCommand implements Command {
  readonly name = 'redo';
  readonly syntax = 'redo';

  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    this.context.document;
    CommandArguments.count(parameters, 0, 0, this.syntax);
    return this.context.redo();
  }
}
