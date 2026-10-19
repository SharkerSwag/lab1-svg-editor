import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';

export class ShowCommand implements Command {
  readonly name = 'show';
  readonly syntax = 'show <id>';

  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    const document = this.context.document;
    CommandArguments.count(parameters, 1, 1, this.syntax);
    const shape = document.shape(parameters[0]!);
    const parentId = document.parentOf(shape.id);
    const lines = [`${shape.label}  parent=${parentId === undefined ? 'svg' : `g#${parentId}`}`];
    if (shape.geometry.size > 0) {
      lines.push(`  ${Array.from(shape.geometry, ([key, value]) => `${key}=${value}`).join(' ')}`);
    }
    if (shape.text !== undefined) { lines.push(`  text=${JSON.stringify(shape.text)}`); }
    if (shape.styles.size > 0) {
      lines.push(`  ${Array.from(shape.styles, ([key, value]) => `${key}=${value}`).join(' ')}`);
    }
    for (const [name, value] of shape.presentation) { lines.push(`  ${name}=${JSON.stringify(value)}`); }
    return lines.join('\n');
  }
}
