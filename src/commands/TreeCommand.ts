import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { TreeRenderer } from './TreeRenderer.js';

export class TreeCommand implements Command {
  readonly name = 'tree';
  readonly syntax = 'tree [id]';
  private readonly renderer = new TreeRenderer();

  constructor(private readonly context: CommandContext) {}

  execute(parameters: readonly string[]): string {
    const document = this.context.document;
    CommandArguments.count(parameters, 0, 1, this.syntax);
    return this.renderer.render(document, parameters[0]);
  }
}
