import { ShapeFactory } from '../model/ShapeFactory.js';
import type { Command } from './Command.js';
import { CommandArguments } from './CommandArguments.js';
import type { CommandContext } from './CommandContext.js';
import { CreateShapeEdit } from './CreateShapeEdit.js';

export class CreateCommand implements Command {
  readonly name = 'create';
  readonly syntax = 'create <type> <id> [params...] [in <containerId>]';

  constructor(private readonly context: CommandContext, private readonly factory = new ShapeFactory()) {}

  execute(parameters: readonly string[]): string {
    const document = this.context.document;
    CommandArguments.count(parameters, 2, Infinity, this.syntax);
    const [type, id, ...shapeParameters] = parameters;
    let parentId: string | undefined;
    if (shapeParameters.at(-2) === 'in') {
      parentId = shapeParameters.at(-1)!;
      shapeParameters.splice(-2);
    }
    const shape = this.factory.create(type!, id!, shapeParameters);
    return this.context.perform(new CreateShapeEdit(document, shape, parentId));
  }
}
