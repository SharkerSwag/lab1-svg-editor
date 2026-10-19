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
import { SaveCommand } from './commands/SaveCommand.js';
import { FileDocumentStorage } from './io/FileDocumentStorage.js';
import { MoveCommand } from './commands/MoveCommand.js';
import { ScaleCommand } from './commands/ScaleCommand.js';
import { SetCommand } from './commands/SetCommand.js';
import { DeleteCommand } from './commands/DeleteCommand.js';
import { GroupCommand } from './commands/GroupCommand.js';
import { UngroupCommand } from './commands/UngroupCommand.js';
import { AddToCommand } from './commands/AddToCommand.js';
import { FrontCommand } from './commands/FrontCommand.js';
import { BackCommand } from './commands/BackCommand.js';
import { ReadCommand } from './commands/ReadCommand.js';

const session = new EditorSession(new FileDocumentStorage());
const registry = new CommandRegistry([
  new HelpCommand(),
  new InitCommand(session),
  new CanvasCommand(session),
  new SaveCommand(session),
  new ReadCommand(session),
  new CreateCommand(session),
  new MoveCommand(session),
  new ScaleCommand(session),
  new SetCommand(session),
  new DeleteCommand(session),
  new GroupCommand(session),
  new UngroupCommand(session),
  new AddToCommand(session),
  new FrontCommand(session),
  new BackCommand(session),
  new TreeCommand(session),
  new ShowCommand(session),
  new UndoCommand(session),
  new RedoCommand(session),
]);
const application = new EditorApplication(registry);
const cli = new Cli(new CommandParser(), application);

await cli.run(process.stdin, process.stdout, Boolean(process.stdin.isTTY && process.stdout.isTTY));
