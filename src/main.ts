import { CommandRegistry } from './application/CommandRegistry.js';
import { EditorApplication } from './application/EditorApplication.js';
import { Cli } from './cli/Cli.js';
import { CommandParser } from './cli/CommandParser.js';
import { HelpCommand } from './commands/HelpCommand.js';

const registry = new CommandRegistry([new HelpCommand()]);
const application = new EditorApplication(registry);
const cli = new Cli(new CommandParser(), application);

await cli.run(process.stdin, process.stdout, Boolean(process.stdin.isTTY && process.stdout.isTTY));
