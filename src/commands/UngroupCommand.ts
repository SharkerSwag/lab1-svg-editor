import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { UngroupEdit } from './UngroupEdit.js';

export class UngroupCommand implements Command {
  readonly name = 'ungroup';
  readonly syntax = 'ungroup <gid>';
  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    const document = this.context.document;
    CommandArguments.count(parameters, 1, 1, this.syntax);
    return this.context.perform(new UngroupEdit(document, parameters[0]!));
  }
}
