import type { Command } from '../commands/Command.js';

/** The only location that dispatches by command name. */
export class CommandRegistry {
  private readonly commands = new Map<string, Command>();

  constructor(commands: readonly Command[]) {
    for (const command of commands) {
      if (this.commands.has(command.name)) {
        throw new Error(`command already registered: ${command.name}`);
      }
      this.commands.set(command.name, command);
    }
  }

  execute(name: string, parameters: readonly string[]): string {
    const command = this.commands.get(name);
    if (command === undefined) {
      throw new Error(`unknown command: ${name}`);
    }
    return command.execute(parameters);
  }

  complete(line: string): string[] {
    if (/\s/u.test(line)) { return []; }
    return [...this.commands.keys()].filter((name) => name.startsWith(line)).sort();
  }
}
