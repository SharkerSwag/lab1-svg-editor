import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { PassThrough, Readable } from 'node:stream';
import { test } from 'node:test';
import { CommandRegistry } from '../src/application/CommandRegistry.js';
import { EditorApplication } from '../src/application/EditorApplication.js';
import { Cli } from '../src/cli/Cli.js';
import { CommandParser } from '../src/cli/CommandParser.js';
import { HelpCommand } from '../src/commands/HelpCommand.js';

test('rejects duplicate command registration', () => {
  assert.throws(() => new CommandRegistry([new HelpCommand(), new HelpCommand()]), /already registered/u);
});

test('reports errors on one line and continues processing the script', () => {
  const output = execFileSync(process.execPath, ['dist/src/main.js'], {
    input: '# comment\r\n\r\nmissing\r\nhelp extra\r\n"broken\r\nhelp\r\n',
    encoding: 'utf8',
  });
  assert.match(output, /error: unknown command: missing\n/u);
  assert.match(output, /error: usage: help\n/u);
  assert.match(output, /error: unterminated double quote\n/u);
  assert.match(output, /Available now:\n {2}help\n/u);
  assert.equal(output.match(/^error:/gmu)?.length, 3);
});

test('writes an interactive prompt and finishes cleanly on EOF', async () => {
  const output = new PassThrough();
  const chunks: Buffer[] = [];
  output.on('data', (chunk: Buffer) => chunks.push(chunk));
  const cli = new Cli(
    new CommandParser(),
    new EditorApplication(new CommandRegistry([new HelpCommand()])),
  );
  await cli.run(Readable.from(['help\n']), output, true);
  const result = Buffer.concat(chunks).toString('utf8');
  assert.match(result, /\nsvg> SVG editor/u);
  assert.ok(result.endsWith('svg> '));
});
