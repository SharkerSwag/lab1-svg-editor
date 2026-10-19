import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { EditorSession } from '../src/application/EditorSession.js';
import { CreateCommand } from '../src/commands/CreateCommand.js';
import { InitCommand } from '../src/commands/InitCommand.js';
import { ReadCommand } from '../src/commands/ReadCommand.js';
import { SaveCommand } from '../src/commands/SaveCommand.js';
import { FileDocumentStorage } from '../src/io/FileDocumentStorage.js';
import { SvgReader } from '../src/io/SvgReader.js';
import { SvgSerializer } from '../src/io/SvgSerializer.js';
import { Group } from '../src/model/Group.js';
import { ShapeFactory } from '../src/model/ShapeFactory.js';
import { SvgDocument } from '../src/model/SvgDocument.js';

test('assignment other.svg imports seven elements with exactly one missing-id warning', () => {
  const loaded = new SvgReader().read(readFileSync('examples/other.svg', 'utf8'));
  assert.deepEqual(loaded.warnings, ['warning: assigned id rect1 to unnamed <rect>']);
  assert.equal(loaded.document.size, 7);
  assert.equal(loaded.document.width, 400);
  assert.equal(loaded.document.height, 300);
  assert.equal(loaded.document.parentOf('r2'), 'g1');
  assert.equal(loaded.document.shape('t1').text, 'imported');
});

test('missing ids reserve all explicit ids before allocating per-tag numbers', () => {
  const loaded = new SvgReader().read('<svg><rect/><rect id="rect1"/><g><circle/></g><rect/></svg>');
  assert.deepEqual(loaded.document.children.map((shape) => shape.id), ['rect2', 'rect1', 'g1', 'rect3']);
  assert.equal(loaded.document.parentOf('circle1'), 'g1');
  assert.deepEqual(loaded.warnings, [
    'warning: assigned id rect2 to unnamed <rect>',
    'warning: assigned id g1 to unnamed <g>',
    'warning: assigned id circle1 to unnamed <circle>',
    'warning: assigned id rect3 to unnamed <rect>',
  ]);
  assert.equal(loaded.document.width, 800);
  assert.equal(loaded.document.height, 600);
});

test('all six types round-trip Unicode, XML metacharacters, geometry, styles and tree order', () => {
  const document = new SvgDocument(400.5, 300.25);
  const factory = new ShapeFactory();
  document.add(new Group('g').withAttribute('fill', 'blue').withPresentation('font-family', 'Microsoft YaHei'));
  const shapes = [
    factory.create('rect', 'r&"', ['-1.5', '2.5', '3', '4', '#abc']).withAttribute('stroke-width', '2'),
    factory.create('circle', 'c', ['1', '2', '3']).withAttribute('stroke', 'red').withAttribute('fill', 'none'),
    factory.create('ellipse', 'e', ['1', '2', '3', '4']),
    factory.create('line', 'l', ['1', '2', '3', '4', 'black']),
    factory.create('text', 't', ['1', '2', '中文 😀 <&> "\r\n\t\u0085\u2028'])
      .withPresentation('text-anchor', 'middle').withPresentation('font-size', '16'),
  ];
  for (const shape of shapes) { document.add(shape, 'g'); }
  const serializer = new SvgSerializer();
  const loaded = new SvgReader().read(serializer.serialize(document));
  assert.deepEqual(loaded.warnings, []);
  assert.equal(loaded.document.size, document.size);
  assert.deepEqual(loaded.document.shape('g').children.map((shape) => shape.id), shapes.map((shape) => shape.id));
  for (const original of [document.shape('g'), ...shapes]) {
    const actual = loaded.document.shape(original.id);
    assert.deepEqual(actual.geometry, original.geometry);
    assert.deepEqual(actual.styles, original.styles);
    assert.deepEqual(actual.presentation, original.presentation);
    assert.equal(actual.text, original.text);
    assert.equal(loaded.document.parentOf(original.id), document.parentOf(original.id));
  }
});

test('read accepts namespaces, comments, CDATA, px units and viewBox-based canvas dimensions', () => {
  const loaded = new SvgReader().read(`
    <s:svg xmlns:s="http://www.w3.org/2000/svg" viewBox="0,0,400,300">
      <s:title>Title metadata</s:title><!-- comment -->
      <s:rect id="r" width="10px" height="20px" stroke-width="2px"/>
      <s:text id="t" x="3px" y="4"><![CDATA[<raw> & 中文]]></s:text>
    </s:svg>`);
  assert.equal(loaded.document.width, 400);
  assert.equal(loaded.document.height, 300);
  assert.equal(loaded.document.shape('r').geometry.get('width'), 10);
  assert.equal(loaded.document.shape('r').styles.get('stroke-width'), '2');
  assert.equal(loaded.document.shape('t').text, '<raw> & 中文');
});

test('root presentation inheritance and nested translates retain visual positions and font attributes', () => {
  const loaded = new SvgReader().read(`
    <svg width="400" height="300" fill="blue" font-size="16" transform="translate(1,2)">
      <g id="g" transform="translate(10,20)">
        <rect id="r" x="1" y="2" width="3" height="4" transform="translate(-2,-3)"/>
        <text id="t" x="5" y="6" text-anchor="middle">Hello</text>
      </g>
    </svg>`);
  assert.equal(loaded.document.shape('r').geometry.get('x'), 10);
  assert.equal(loaded.document.shape('r').geometry.get('y'), 21);
  assert.equal(loaded.document.shape('t').geometry.get('x'), 16);
  assert.equal(loaded.document.shape('t').geometry.get('y'), 28);
  assert.equal(loaded.document.shape('g').styles.get('fill'), 'blue');
  assert.equal(loaded.document.shape('g').presentation.get('font-size'), '16');
  assert.equal(loaded.document.shape('t').presentation.get('text-anchor'), 'middle');
  assert.doesNotMatch(new SvgSerializer().serialize(loaded.document), /transform=/u);
});

test('unknown composite markers degrade to ordinary g with a visible warning', () => {
  const loaded = new SvgReader().read('<svg><g id="n" data-kind="box"><rect id="r" width="10" height="20"/></g></svg>');
  assert.equal(loaded.document.shape('n').tag, 'g');
  assert.equal(loaded.document.parentOf('r'), 'n');
  assert.match(loaded.warnings[0]!, /loaded as ordinary g/u);
});

test('reader rejects malformed or lossy imports rather than silently changing them', () => {
  const reader = new SvgReader();
  const invalid = [
    '', '<root/>', '<svg><g></svg>', '<svg><rect id="a" id="b"/></svg>',
    '<svg><g id="a"/><rect id="a"/></svg>', '<svg><g id=""/></svg>',
    '<svg><g id="a b"/></svg>', '<svg><path id="p" d="M0 0"/></svg>',
    '<svg><rect id="r" width="-1"/></svg>', '<svg width="100%"/>',
    '<svg width="100" height="100" viewBox="1 0 100 100"/>',
    '<svg><g id="g" transform="scale(2)"/></svg>',
    '<svg><g id="g" transform="rotate(30)"/></svg>',
    '<svg><text id="t" style="fill:red">text</text></svg>',
    '<svg><rect id="r" onclick="bad"/></svg>', '<svg><text id="t">&missing;</text></svg>',
    '<svg><text id="t">\u0000</text></svg>', '<!DOCTYPE svg><svg/>',
    '<svg xmlns="urn:other"/>', '<svg><x:rect xmlns:x="urn:other"/></svg>',
    '<svg>unexpected text</svg>', '<svg><rect id="r"><circle id="c"/></rect></svg>',
  ];
  for (const xml of invalid) { assert.throws(() => reader.read(xml), xml); }
  const distinct = reader.read('<svg><g id="a"/><g id="A"/></svg>');
  assert.equal(distinct.document.size, 2);
});

test('successful read establishes a path, replaces the document and sets the history barrier', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-read-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'read.svg');
  writeFileSync(file, '<svg width="400" height="300"><g id="imported"/></svg>');
  const session = new EditorSession(new FileDocumentStorage());
  const output = new ReadCommand(session).execute([file]);
  assert.equal(output, `read ${file} (1 elements)`);
  assert.equal(session.associatedPath, file);
  assert.throws(() => session.undo(), /undo not allowed after io command/u);
  assert.throws(() => session.redo(), /undo not allowed after io command/u);
  new CreateCommand(session).execute(['text', 't', '1', '2', 'new']);
  new SaveCommand(session).execute([]);
  assert.match(readFileSync(file, 'utf8'), /new<\/text>/u);
});

test('failed reads preserve the current document, path, history and barrier state', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-read-failure-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'good.svg');
  const malformed = join(directory, 'malformed.svg');
  const invalidUtf8 = join(directory, 'invalid-utf8.svg');
  writeFileSync(file, '<svg><g id="original"/></svg>');
  writeFileSync(malformed, '<svg><g/></svg>garbage');
  writeFileSync(invalidUtf8, Buffer.from([0xff, 0xfe]));
  const session = new EditorSession(new FileDocumentStorage());
  const read = new ReadCommand(session);
  read.execute([file]);
  const create = new CreateCommand(session);
  create.execute(['g', 'redo']);
  session.undo();
  const before = new SvgSerializer().serialize(session.document);
  for (const failure of [join(directory, 'missing.svg'), malformed, invalidUtf8, directory]) {
    assert.throws(() => read.execute([failure]), /cannot read file/u);
    assert.equal(new SvgSerializer().serialize(session.document), before);
    assert.equal(session.associatedPath, file);
  }
  session.redo();
  assert.equal(session.document.has('redo'), true);
  new InitCommand(session).execute([]);
  assert.throws(() => read.execute([malformed]), /cannot read file/u);
  assert.throws(() => session.undo(), /undo not allowed after io command/u);
});

test('actual CLI reads without init, emits warnings and saves back to the read path', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-cli-read-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, 'read with spaces.svg');
  writeFileSync(file, '<svg width="400" height="300"><rect width="10" height="20"/></svg>');
  const output = execFileSync(process.execPath, ['dist/src/main.js'], {
    input: `read "${file}"\ncreate text t 20 40 "开始"\nsave\nundo\n`,
    encoding: 'utf8',
  });
  assert.match(output, /warning: assigned id rect1 to unnamed <rect>/u);
  assert.match(output, /error: undo not allowed after io command/u);
  const loaded = new SvgReader().read(readFileSync(file, 'utf8'));
  assert.equal(loaded.document.shape('t').text, '开始');
});

test('reader rejects invalid numeric XML references in text, attributes and ignored metadata', () => {
  const reader = new SvgReader();
  for (const reference of ['&#0;', '&#x1;', '&#xD800;', '&#xFFFE;', '&#x110000;', '&#4294967361;']) {
    assert.throws(() => reader.read(`<svg><text id="t">${reference}</text></svg>`), /XML|character reference/u);
    assert.throws(() => reader.read(`<svg><g id="g" fill="${reference}"/></svg>`), /XML|character reference/u);
    assert.throws(() => reader.read(`<svg><title>${reference}</title></svg>`), /XML|character reference/u);
  }
});

test('literal reference spelling in CDATA, comments and instructions remains valid text', () => {
  const reader = new SvgReader();
  const loaded = reader.read('<?note &#0;?> <svg><!-- &#0; --><text id="t"><![CDATA[&#0; &#xD800;]]></text></svg>');
  assert.equal(loaded.document.shape('t').text, '&#0; &#xD800;');
  const characters = reader.read('<svg><text id="t">&#x1F600;&#13;&#10;&#9;&amp;#0;</text></svg>');
  assert.equal(characters.document.shape('t').text, '😀\r\n\t&#0;');
});

test('reader rejects malformed active references and unescaped ampersands', () => {
  const reader = new SvgReader();
  for (const invalid of ['&#-4294967231;', '&#+4294967361;', '&#;', '&#x;', '&#65', '&#x 41;', '&AMP;', 'A & B']) {
    assert.throws(() => reader.read(`<svg><text id="t">${invalid}</text></svg>`));
    assert.throws(() => reader.read(`<svg><g id="g" fill="${invalid}"/></svg>`));
  }
  const literal = reader.read('<svg><text id="t"><![CDATA[&#-1; A & B]]>&amp;#-1;</text></svg>');
  assert.equal(literal.document.shape('t').text, '&#-1; A & B&#-1;');
});

test('a rejected character-reference import preserves the previous document and redo stack', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-read-invalid-reference-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const invalid = join(directory, 'invalid-reference.svg');
  writeFileSync(invalid, '<svg><text id="t">&#0;</text></svg>');
  const session = new EditorSession(new FileDocumentStorage());
  new InitCommand(session).execute([]);
  new CreateCommand(session).execute(['g', 'keep']);
  session.undo();
  const previous = session.document;
  assert.throws(() => session.read(invalid), /cannot read file/u);
  assert.equal(session.document, previous);
  assert.equal(session.associatedPath, undefined);
  session.redo();
  assert.equal(session.document.has('keep'), true);
});
