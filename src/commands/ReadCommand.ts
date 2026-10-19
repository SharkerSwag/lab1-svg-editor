import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';

export class ReadCommand implements Command {
  readonly name = 'read';
  readonly syntax = 'read <file.svg>';
  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    CommandArguments.count(parameters, 1, 1, this.syntax);
    const file = parameters[0]!;
    const warnings = this.context.read(file);
    return [...warnings, `read ${file} (${this.context.document.size} elements)`].join('\n');
  }
}
