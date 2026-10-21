import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PassThrough, Readable } from 'node:stream';
import { test } from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { CommandRegistry } from '../src/application/CommandRegistry.js';
import { EditorApplication } from '../src/application/EditorApplication.js';
import { EditorSession } from '../src/application/EditorSession.js';
import { Cli } from '../src/cli/Cli.js';
import { CliOptions } from '../src/cli/CliOptions.js';
import { CommandParser } from '../src/cli/CommandParser.js';
import { CreateCommand } from '../src/commands/CreateCommand.js';
import { HelpCommand } from '../src/commands/HelpCommand.js';
import { InitCommand } from '../src/commands/InitCommand.js';
import { MoveCommand } from '../src/commands/MoveCommand.js';
import { FileDocumentStorage } from '../src/io/FileDocumentStorage.js';
import { SvgReader } from '../src/io/SvgReader.js';
import { Group } from '../src/model/Group.js';
import { Rect } from '../src/model/Rect.js';
import { SvgDocument } from '../src/model/SvgDocument.js';

test('document equality compares content and order, independently of attribute insertion order', () => {
  const a = new SvgDocument();
  const group = new Group('g');
  group.insert(new Rect('r', 1, 2, 3, 4).withAttribute('fill', 'red').withAttribute('stroke', 'blue'));
  a.add(group);
  const b = new SvgDocument();
  b.add(new Group('g'));
  b.add(new Rect('r', 1, 2, 3, 4).withAttribute('stroke', 'blue').withAttribute('fill', 'red'), 'g');
  assert.equal(a.equals(b), true);
  b.replace('r', b.shape('r').moved(1, 0));
  assert.equal(a.equals(b), false);
  assert.equal(a.equals(a.clone()), true);
  b.restore(a);
  b.resize(900, 600);
  assert.equal(a.equals(b), false);
  b.restore(a);
  b.add(new Group('sibling'));
  const reordered = b.clone();
  reordered.remove('g');
  reordered.add(a.shape('g'));
  assert.equal(b.equals(reordered), false);
});

test('unsaved state follows edits, exact undo to the saved snapshot, redo, failed IO and exports', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-dirty-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'original.svg');
  const copy = join(directory, 'copy.svg');
  const session = new EditorSession(new FileDocumentStorage());
  assert.equal(session.hasUnsavedChanges, false);
  new InitCommand(session).execute([]);
  assert.equal(session.hasUnsavedChanges, true);
  new CreateCommand(session).execute(['rect', 'r', '1', '2', '3', '4']);
  session.save(file);
  assert.equal(session.hasUnsavedChanges, false);
  new MoveCommand(session).execute(['r', '10', '0']);
  assert.equal(session.hasUnsavedChanges, true);
  session.undo();
  assert.equal(session.hasUnsavedChanges, false);
  session.redo();
  assert.equal(session.hasUnsavedChanges, true);
  assert.throws(() => session.save(join(directory, 'missing', 'bad.svg')));
  assert.throws(() => session.read(join(directory, 'missing.svg')));
  assert.equal(session.hasUnsavedChanges, true);
  session.save(copy);
  assert.equal(session.hasUnsavedChanges, false, 'the current snapshot has been persisted to the export');
  assert.equal(session.associatedPath, file, 'an export still does not retarget the read/default path');
  session.resizeCanvas(400, 300);
  assert.equal(session.hasUnsavedChanges, true);
  session.read(file);
  assert.equal(session.hasUnsavedChanges, false);
});

test('startup options accept quoted paths and reject ambiguous or unknown inputs', () => {
  const options = new CliOptions(['--preview', '--no-open', '--copy', '我的图 with spaces.svg']);
  assert.equal(options.preview, true);
  assert.equal(options.openBrowser, false);
  assert.equal(options.copy, '我的图 with spaces.svg');
  assert.throws(() => new CliOptions(['--file', 'a', '--copy', 'b']), /cannot be used together/u);
  assert.throws(() => new CliOptions(['--script', '']), /empty/u);
  assert.throws(() => new CliOptions(['--unknown']));
  assert.throws(() => new CliOptions(['unexpected']));
});

test('completion uses the registered commands and never changes document history', () => {
  const session = new EditorSession();
  const app = new EditorApplication(new CommandRegistry([new InitCommand(session), new CreateCommand(session), new HelpCommand()]));
  assert.deepEqual(app.complete('cr'), ['create']);
  assert.deepEqual(app.complete(''), ['create', 'help', 'init']);
  assert.deepEqual(app.complete('move r'), []);
  app.execute(['init']);
  app.execute(['create', 'g', 'g']);
  app.complete('he');
  session.undo();
  assert.equal(session.document.size, 0);
});

test('CLI notifies preview after commands and parse errors, and reports unsaved exit without extra commands', async () => {
  const session = new EditorSession();
  const app = new EditorApplication(new CommandRegistry([new InitCommand(session), new CreateCommand(session)]));
  const output = new PassThrough();
  let text = '';
  output.on('data', (chunk: Buffer) => { text += chunk.toString('utf8'); });
  let changes = 0;
  const cli = new Cli(new CommandParser(), app, () => { changes += 1; }, () => session.hasUnsavedChanges);
  const errors = await cli.run(Readable.from(['init\ncreate g g\n"broken\n']), output, true);
  assert.equal(changes, 3);
  assert.equal(errors, 1);
  assert.match(text, /error: unterminated double quote/u);
  assert.match(text, /warning: 当前更改未保存到文件/u);
});

test('interactive readline completes Tab, recalls history and requires a second interrupt to discard unsaved changes', async () => {
  const input = Object.assign(new PassThrough(), { isTTY: true, setRawMode: (_enabled: boolean) => input });
  const output = Object.assign(new PassThrough(), { isTTY: true, columns: 100 });
  let text = '';
  output.on('data', (chunk: Buffer) => { text += chunk.toString('utf8'); });
  const cli = new Cli(new CommandParser(), new EditorApplication(new CommandRegistry([new HelpCommand()])), undefined, () => true);
  // Node deliberately disables editing keys for TERM=dumb (including the test host).
  const previousTerm = process.env.TERM;
  process.env.TERM = 'xterm-256color';
  let running: Promise<number>;
  try { running = cli.run(input, output, true); }
  finally {
    if (previousTerm === undefined) { delete process.env.TERM; }
    else { process.env.TERM = previousTerm; }
  }
  input.write('he\t');
  await setImmediate();
  input.write('\r');
  await setImmediate();
  assert.match(text, /SVG editor — Lab1 Phase 1/u);
  const count = text.split('SVG editor — Lab1 Phase 1').length;
  input.write('\u001b[A\r');
  await setImmediate();
  assert.equal(text.split('SVG editor — Lab1 Phase 1').length, count + 1);
  input.write('\u0003');
  await setImmediate();
  assert.match(text, /再次 Ctrl\+C 放弃并退出/u);
  assert.equal(input.destroyed, false);
  input.write('\u0003');
  await running;
  input.end();
});

test('startup --copy opens a detached document and never silently overwrites the source', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-copy-startup-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, '中文 example.svg');
  const original = '<svg><g id="original"/></svg>';
  writeFileSync(file, original);
  const run = spawnSync(process.execPath, ['dist/src/main.js', '--copy', file], {
    input: 'create g new\nsave\ntree\n', encoding: 'utf8', timeout: 10000,
  });
  assert.equal(run.status, 0);
  assert.match(run.stdout, /error: no file path/u);
  assert.match(run.stdout, /g#new/u);
  assert.equal(readFileSync(file, 'utf8'), original);
});

test('startup --file keeps the supplied path for parameterless save', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-file-startup-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'open.svg');
  writeFileSync(file, '<svg/>');
  const run = spawnSync(process.execPath, ['dist/src/main.js', '--file', file], {
    input: 'create g new\nsave\n', encoding: 'utf8', timeout: 10000,
  });
  assert.equal(run.status, 0);
  assert.match(readFileSync(file, 'utf8'), /id="new"/u);
});

test('explicit script playback reports failure in its exit code and continues after an invalid line', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-script-startup-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const script = join(directory, '带空格 script.txt');
  const destination = join(directory, 'saved.svg');
  writeFileSync(script, `init\ncreate g first\nmissing\ncreate g second\nsave "${destination}"\n`);
  const run = spawnSync(process.execPath, [resolve('dist/src/main.js'), '--script', script], {
    cwd: directory, encoding: 'utf8', timeout: 10000,
  });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /error: unknown command: missing/u);
  assert.equal(new SvgReader().read(readFileSync(destination, 'utf8')).document.size, 2);
  writeFileSync(script, 'init\ncreate g correct\n');
  const success = spawnSync(process.execPath, [resolve('dist/src/main.js'), '--script', script], {
    cwd: directory, encoding: 'utf8', timeout: 10000,
  });
  assert.equal(success.status, 0);
});

test('startup help, missing files and bad flags terminate with useful messages', () => {
  const help = spawnSync(process.execPath, ['dist/src/main.js', '--help'], { encoding: 'utf8', timeout: 10000 });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /npm start/u);
  for (const args of [['--invalid'], ['--script', 'missing-command-file.txt'], ['--file', 'missing-startup.svg']]) {
    const run = spawnSync(process.execPath, ['dist/src/main.js', ...args], { encoding: 'utf8', timeout: 10000 });
    assert.equal(run.status, 1);
    assert.match(run.stderr, /^error: [^\n]+\n$/u);
  }
});
