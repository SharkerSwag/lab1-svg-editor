import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';

export class SaveCommand implements Command {
  readonly name = 'save';
  readonly syntax = 'save [file.svg]';

  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    const document = this.context.document;
    CommandArguments.count(parameters, 0, 1, this.syntax);
    const file = this.context.save(parameters[0]);
    return `saved to ${file} (${document.size} elements)`;
  }
}
