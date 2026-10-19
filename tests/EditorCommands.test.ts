import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { EditorSession } from '../src/application/EditorSession.js';
import { CanvasCommand } from '../src/commands/CanvasCommand.js';
import { CreateCommand } from '../src/commands/CreateCommand.js';
import { HelpCommand } from '../src/commands/HelpCommand.js';
import { InitCommand } from '../src/commands/InitCommand.js';
import { RedoCommand } from '../src/commands/RedoCommand.js';
import { ShowCommand } from '../src/commands/ShowCommand.js';
import { TreeCommand } from '../src/commands/TreeCommand.js';
import { UndoCommand } from '../src/commands/UndoCommand.js';

test('CLI guards document commands before init but help stays available', () => {
  const output = execFileSync(process.execPath, ['dist/src/main.js'], {
    input: 'tree\nshow x\ncreate g g\ncanvas\nundo\nredo\nhelp\n',
    encoding: 'utf8',
  });
  assert.equal(output.match(/error: no document\. use 'init' or 'read' first/gu)?.length, 6);
  assert.match(output, /Available now:/u);
});

test('init supports defaults, width-only, explicit floating dimensions and resets the tree', () => {
  const session = new EditorSession();
  const init = new InitCommand(session);
  assert.equal(init.execute([]), 'canvas 800x600 created');
  assert.equal(init.execute(['400']), 'canvas 400x600 created');
  new CreateCommand(session).execute(['g', 'old']);
  assert.equal(init.execute(['400.5', '300']), 'canvas 400.5x300 created');
  assert.equal(session.document.size, 0);
  assert.throws(() => session.undo(), /undo not allowed after io command/u);
  assert.throws(() => session.redo(), /undo not allowed after io command/u);
});

test('tree and show display nested geometry, styles, content and parents', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'scene']);
  assert.equal(create.execute(['rect', 'r', '1', '2', '3', '4', '#eee', 'in', 'scene']), 'rect#r created in g#scene');
  create.execute(['text', 't', '5', '6', '中文 in #fff', 'in', 'scene']);
  create.execute(['circle', 'c', '1', '2', '3']);
  create.execute(['ellipse', 'e', '1', '2', '3', '4']);
  create.execute(['line', 'l', '1', '2', '3', '4', 'black']);
  assert.equal(new TreeCommand(session).execute(['scene']), [
    'g#scene',
    '├── rect#r x=1 y=2 w=3 h=4 fill=#eee',
    '└── text#t (5,6) "中文 in #fff"',
  ].join('\n'));
  assert.equal(new ShowCommand(session).execute(['r']), 'rect#r  parent=g#scene\n  x=1 y=2 width=3 height=4\n  fill=#eee');
  assert.match(new ShowCommand(session).execute(['t']), /text="中文 in #fff"/u);
  assert.match(new ShowCommand(session).execute(['c']), /parent=svg\n {2}cx=1 cy=2 r=3/u);
  assert.match(new TreeCommand(session).execute([]), /ellipse#e cx=1 cy=2 rx=3 ry=4/u);
  assert.match(new TreeCommand(session).execute(['l']), /^line#l \(1,2\) -> \(3,4\) stroke=black$/u);
});

test('failed creates leave tree and redo history intact, including invalid parent targets', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'g']);
  create.execute(['circle', 'leaf', '0', '0', '1']);
  create.execute(['rect', 'r', '1', '2', '3', '4', 'in', 'g']);
  session.undo();
  const tree = new TreeCommand(session);
  const before = tree.execute([]);
  const failures: readonly (readonly [readonly string[], RegExp])[] = [
    [['g', 'g'], /id already exists: g/u],
    [['g', 'candidate', 'in', 'missing'], /no such container: missing/u],
    [['g', 'candidate', 'in', 'leaf'], /not a container: leaf/u],
    [['box', 'b'], /unknown shape type: box/u],
    [['rect', 'bad', '0', '0', '-1', '2'], /width must be non-negative/u],
    [['circle', 'bad', 'NaN', '1', '2'], /finite number/u],
    [['g', 'bad', 'extra'], /usage: create g/u],
    [['g', ''], /id must/u],
    [[], /usage: create/u],
  ];
  for (const [parameters, error] of failures) {
    assert.throws(() => create.execute(parameters), error);
    assert.equal(tree.execute([]), before);
    assert.equal(session.document.size, 2);
  }
  session.redo();
  assert.equal(session.document.parentOf('r'), 'g');
  assert.equal(session.document.size, 3);
  create.execute(['g', 'candidate']);
});

test('failed init and canvas edits preserve the document, dimensions and redo history', () => {
  const session = new EditorSession();
  const init = new InitCommand(session);
  init.execute(['400', '300']);
  new CreateCommand(session).execute(['g', 'g']);
  session.undo();
  const document = session.document;
  const canvas = new CanvasCommand(session);
  assert.throws(() => init.execute(['800', '-1']), /canvas height must be positive/u);
  assert.throws(() => init.execute(['800', '600', 'extra']), /usage: init/u);
  assert.throws(() => canvas.execute(['900', '0']), /canvas height must be positive/u);
  assert.throws(() => canvas.execute(['NaN', '500']), /finite number/u);
  assert.throws(() => canvas.execute(['900']), /usage: canvas/u);
  assert.equal(session.document, document);
  assert.equal(canvas.execute([]), 'canvas 400x300');
  session.redo();
  assert.equal(document.shape('g').id, 'g');
});

test('display commands do not affect history; successful canvas resize creates a barrier', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'g']);
  const canvas = new CanvasCommand(session);
  canvas.execute([]);
  new TreeCommand(session).execute([]);
  new ShowCommand(session).execute(['g']);
  new HelpCommand().execute([]);
  session.undo();
  assert.equal(session.document.size, 0);
  session.redo();
  assert.equal(canvas.execute(['640', '480']), 'canvas resized to 640x480');
  assert.throws(() => session.undo(), /undo not allowed after io command/u);
  assert.throws(() => session.redo(), /undo not allowed after io command/u);
  assert.throws(() => create.execute(['g', 'g']), /id already exists/u);
  assert.throws(() => session.undo(), /undo not allowed after io command/u);
  create.execute(['g', 'next']);
  session.undo();
  assert.equal(session.document.size, 1);
  assert.throws(() => session.undo(), /nothing to undo/u);
});

test('successful edit clears redo while malformed undo/redo commands do not consume history', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'first']);
  create.execute(['g', 'second']);
  const undo = new UndoCommand(session);
  const redo = new RedoCommand(session);
  assert.throws(() => undo.execute(['extra']), /usage: undo/u);
  undo.execute([]);
  assert.throws(() => redo.execute(['extra']), /usage: redo/u);
  redo.execute([]);
  undo.execute([]);
  create.execute(['g', 'third']);
  assert.throws(() => redo.execute([]), /nothing to redo/u);
  assert.deepEqual(session.document.children.map((shape) => shape.id), ['first', 'third']);
});

test('nested creation can be completely undone and redone without losing child order', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'outer']);
  create.execute(['g', 'inner', 'in', 'outer']);
  create.execute(['text', 't', '1', '2', '', 'in', 'inner']);
  create.execute(['line', 'l', '1', '2', '3', '4', 'in', 'outer']);
  const tree = new TreeCommand(session);
  const expected = tree.execute([]);
  for (let cycle = 0; cycle < 5; cycle += 1) {
    for (let step = 0; step < 4; step += 1) { session.undo(); }
    assert.equal(tree.execute([]), 'svg (800x600)');
    assert.equal(session.document.size, 0);
    for (let step = 0; step < 4; step += 1) { session.redo(); }
    assert.equal(tree.execute([]), expected);
    assert.equal(session.document.size, 4);
  }
});

test('unknown tree/show targets fail without consuming the latest creation', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  new CreateCommand(session).execute(['g', 'g']);
  assert.throws(() => new TreeCommand(session).execute(['missing']), /no such shape: missing/u);
  assert.throws(() => new ShowCommand(session).execute(['missing']), /no such shape: missing/u);
  session.undo();
  assert.equal(session.document.size, 0);
});

test('example replays through the actual CLI with nested Chinese labels and creation history', () => {
  const input = readFileSync('examples/creation.txt', 'utf8');
  const output = execFileSync(process.execPath, ['dist/src/main.js'], { input, encoding: 'utf8' });
  assert.doesNotMatch(output, /^error:/mu);
  assert.match(output, /text#start-label \(155,135\) "开始"/u);
  assert.match(output, /text#process-label \(545,135\) "处理数据"/u);
  assert.match(output, /rect#start {2}parent=g#node1/u);
  assert.match(output, /line#arrow1 creation undone/u);
  assert.equal(output.match(/line#arrow1 created in g#flowchart/gu)?.length, 2);
  const trees = output.split('line#arrow1 creation undone\n');
  assert.doesNotMatch(trees[1]!.split('line#arrow1 created')[0]!, /line#arrow1/u);
});
