import { CommandRegistry } from './application/CommandRegistry.js';
import { EditorApplication } from './application/EditorApplication.js';
import { EditorSession } from './application/EditorSession.js';
import { Cli } from './cli/Cli.js';
import { CommandParser } from './cli/CommandParser.js';
import { HelpCommand } from './commands/HelpCommand.js';
import { CanvasCommand } from './commands/CanvasCommand.js';
import { CreateCommand } from './commands/CreateCommand.js';
import { InitCommand } from './commands/InitCommand.js';
import { RedoCommand } from './commands/RedoCommand.js';
import { ShowCommand } from './commands/ShowCommand.js';
import { TreeCommand } from './commands/TreeCommand.js';
import { UndoCommand } from './commands/UndoCommand.js';

const session = new EditorSession();
const registry = new CommandRegistry([
  new HelpCommand(),
  new InitCommand(session),
  new CanvasCommand(session),
  new CreateCommand(session),
  new TreeCommand(session),
  new ShowCommand(session),
  new UndoCommand(session),
  new RedoCommand(session),
]);
const application = new EditorApplication(registry);
const cli = new Cli(new CommandParser(), application);

await cli.run(process.stdin, process.stdout, Boolean(process.stdin.isTTY && process.stdout.isTTY));
