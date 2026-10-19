import { CommandRegistry } from './CommandRegistry.js';

export class EditorApplication {
  constructor(private readonly registry: CommandRegistry) {}

  execute(tokens: readonly string[]): string | undefined {
    const [name, ...parameters] = tokens;
    if (name === undefined) {
      return undefined;
    }
    return this.registry.execute(name, parameters);
  }
}
