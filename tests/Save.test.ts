import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { EditorSession } from '../src/application/EditorSession.js';
import { CreateCommand } from '../src/commands/CreateCommand.js';
import { InitCommand } from '../src/commands/InitCommand.js';
import { SaveCommand } from '../src/commands/SaveCommand.js';
import { FileDocumentStorage } from '../src/io/FileDocumentStorage.js';
import { SvgSerializer } from '../src/io/SvgSerializer.js';
import { XmlEscaper } from '../src/io/XmlEscaper.js';
import { ShapeFactory } from '../src/model/ShapeFactory.js';
import { SvgDocument } from '../src/model/SvgDocument.js';

test('serializer preserves all six types, nesting, geometry, styles and escaped text', () => {
  const document = new SvgDocument(400.5, 300);
  const factory = new ShapeFactory();
  document.add(factory.create('g', 'scene', []));
  document.add(factory.create('rect', 'r', ['1', '2', '3', '4', 'red']), 'scene');
  document.add(factory.create('circle', 'c', ['1', '2', '3']));
  document.add(factory.create('ellipse', 'e', ['1', '2', '3', '4']));
  document.add(factory.create('line', 'l', ['1', '2', '3', '4', 'black']));
  document.add(factory.create('text', 't', ['1', '2', '中文 <tag> & "quotes"']));
  const xml = new SvgSerializer().serialize(document);
  assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/u);
  assert.match(xml, /xmlns="http:\/\/www.w3.org\/2000\/svg" width="400.5" height="300" viewBox="0 0 400.5 300"/u);
  assert.match(xml, /<g id="scene">\n {4}<rect id="r" x="1" y="2" width="3" height="4" fill="red"\/>\n {2}<\/g>/u);
  assert.match(xml, /<circle id="c" cx="1" cy="2" r="3"\/>/u);
  assert.match(xml, /<ellipse id="e" cx="1" cy="2" rx="3" ry="4"\/>/u);
  assert.match(xml, /<line id="l" x1="1" y1="2" x2="3" y2="4" stroke="black"\/>/u);
  assert.match(xml, /中文 &lt;tag&gt; &amp; "quotes"<\/text>/u);
  assert.doesNotMatch(xml, /fill="black"|stroke="none"/u);
});

test('XML escaping protects attributes and preserves XML-normalized whitespace', () => {
  const escape = new XmlEscaper();
  assert.equal(escape.attribute('"<&\r\n\t'), '&quot;&lt;&amp;&#13;&#10;&#9;');
  assert.equal(escape.text('a\rb\nc'), 'a&#13;b\nc');
  assert.throws(() => escape.text('\u0000'), /not allowed in XML/u);
  assert.throws(() => escape.text('\ud800'), /not allowed in XML/u);
  assert.equal(escape.text('😀'), '😀');
});

test('successful save associates its path and blocks history until a new edit', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-save-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const session = new EditorSession(new FileDocumentStorage());
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'g']);
  const save = new SaveCommand(session);
  const file = join(directory, 'with spaces.svg');
  assert.equal(save.execute([file]), `saved to ${file} (1 elements)`);
  assert.equal(session.associatedPath, file);
  assert.match(readFileSync(file, 'utf8'), /<g id="g"\/>/u);
  assert.throws(() => session.undo(), /undo not allowed after io command/u);
  assert.throws(() => session.redo(), /undo not allowed after io command/u);
  create.execute(['text', 't', '1', '2', 'hello']);
  session.undo();
  session.redo();
  save.execute([]);
  assert.match(readFileSync(file, 'utf8'), /hello<\/text>/u);
  new InitCommand(session).execute([]);
  assert.equal(session.associatedPath, undefined);
  assert.throws(() => save.execute([]), /no file path/u);
});

test('failed save retains the old path and redo; failed writes leave no temporary files', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-save-failure-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const session = new EditorSession(new FileDocumentStorage());
  new InitCommand(session).execute([]);
  const file = join(directory, 'good.svg');
  const save = new SaveCommand(session);
  save.execute([file]);
  new CreateCommand(session).execute(['g', 'g']);
  session.undo();
  const original = readFileSync(file, 'utf8');
  const invalid = join(directory, 'missing', 'bad.svg');
  assert.throws(() => save.execute([invalid]), { message: `cannot write file: ${invalid}` });
  assert.throws(() => save.execute([directory]), { message: `cannot write file: ${directory}` });
  assert.throws(() => save.execute(['a.svg', 'b.svg']), /usage: save/u);
  assert.equal(session.associatedPath, file);
  assert.equal(readFileSync(file, 'utf8'), original);
  assert.deepEqual(readdirSync(directory), ['good.svg']);
  session.redo();
  assert.equal(session.document.size, 1);
});

test('invalid XML content does not truncate a previously saved file or clear history', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-save-invalid-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'existing.svg');
  writeFileSync(file, 'original');
  const session = new EditorSession(new FileDocumentStorage());
  new InitCommand(session).execute([]);
  new CreateCommand(session).execute(['text', 't', '0', '0', '\u0000']);
  assert.throws(() => new SaveCommand(session).execute([file]), /cannot write file/u);
  assert.equal(readFileSync(file, 'utf8'), 'original');
  assert.equal(session.associatedPath, undefined);
  session.undo();
  assert.equal(session.document.size, 0);
});

test('actual CLI saves UTF-8 SVG to a quoted path and reports the IO barrier', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-cli-export-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'diagram with spaces.svg');
  const output = execFileSync(process.execPath, ['dist/src/main.js'], {
    input: `init 400 200\ncreate text t 20 40 "开始 & <完成>"\nsave "${file}"\nundo\n`,
    encoding: 'utf8',
  });
  assert.match(output, /saved to .* \(1 elements\)/u);
  assert.match(output, /error: undo not allowed after io command/u);
  assert.match(readFileSync(file, 'utf8'), /开始 &amp; &lt;完成&gt;<\/text>/u);
});
