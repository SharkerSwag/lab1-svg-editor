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
import { Readable } from 'node:stream';
import { CliOptions } from './cli/CliOptions.js';
import { LivePreview } from './io/LivePreview.js';
import { BrowserLauncher } from './io/BrowserLauncher.js';
import { CommandFile } from './io/CommandFile.js';

const storage = new FileDocumentStorage();
const session = new EditorSession(storage);
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
let preview: LivePreview | undefined;
try {
  const options = new CliOptions(process.argv.slice(2));
  if (options.help) { process.stdout.write(options.usage + '\n'); }
  else {
    if (options.file !== undefined) { process.stdout.write(registry.execute('read', [options.file]) + '\n'); }
    if (options.copy !== undefined) {
      const loaded = storage.read(options.copy);
      session.initialize(loaded.document);
      for (const warning of loaded.warnings) { process.stdout.write(warning + '\n'); }
      process.stdout.write(`工作副本已打开（${session.document.size} 个元素）。请用 save "文件.svg" 保存你的作品。\n`);
    }
    const input = options.script === undefined ? process.stdin : Readable.from([new CommandFile().read(options.script)]);
    if (options.preview) {
      preview = new LivePreview(session);
      const url = await preview.start();
      process.stdout.write(`实时预览：${url}\n`);
      if (options.openBrowser) {
        try { await new BrowserLauncher().open(url); }
        catch { process.stdout.write(`warning: 浏览器未能自动打开，请手动访问 ${url}\n`); }
      }
    }
    const cli = new Cli(new CommandParser(), application, () => preview?.publish(), () => session.hasUnsavedChanges);
    const errors = await cli.run(input, process.stdout, options.script === undefined && Boolean(process.stdin.isTTY && process.stdout.isTTY));
    if (options.script !== undefined && errors > 0) { process.exitCode = 1; }
  }
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : 'unexpected startup failure';
  process.stderr.write(`error: ${message.replace(/[\r\n]+/gu, ' ')}\n`);
  process.exitCode = 1;
} finally { await preview?.close(); }
