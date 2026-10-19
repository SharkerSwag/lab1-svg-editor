import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EditorSession } from '../src/application/EditorSession.js';
import { AddToCommand } from '../src/commands/AddToCommand.js';
import { BackCommand } from '../src/commands/BackCommand.js';
import { CreateCommand } from '../src/commands/CreateCommand.js';
import { FrontCommand } from '../src/commands/FrontCommand.js';
import { GroupCommand } from '../src/commands/GroupCommand.js';
import { InitCommand } from '../src/commands/InitCommand.js';
import { UngroupCommand } from '../src/commands/UngroupCommand.js';
import { SvgSerializer } from '../src/io/SvgSerializer.js';

test('group preserves document order rather than argument order and uses earliest sibling position', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'outer']);
  for (const id of ['a', 'b', 'c', 'd']) { create.execute(['g', id, 'in', 'outer']); }
  const before = new SvgSerializer().serialize(session.document);
  new GroupCommand(session).execute(['bundle', 'c', 'a']);
  assert.deepEqual(session.document.shape('outer').children.map((shape) => shape.id), ['bundle', 'b', 'd']);
  assert.deepEqual(session.document.shape('bundle').children.map((shape) => shape.id), ['a', 'c']);
  session.undo();
  assert.equal(new SvgSerializer().serialize(session.document), before);
  session.redo();
  assert.equal(session.document.parentOf('a'), 'bundle');
});

test('cross-parent grouping uses lowest common parent and original preorder, preserving geometry', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'outer']);
  create.execute(['g', 'left', 'in', 'outer']);
  create.execute(['g', 'right', 'in', 'outer']);
  create.execute(['rect', 'a', '1', '2', '3', '4', 'in', 'left']);
  create.execute(['g', 'left-remains', 'in', 'left']);
  create.execute(['g', 'right-remains', 'in', 'right']);
  create.execute(['circle', 'b', '8', '9', '10', 'in', 'right']);
  const serializer = new SvgSerializer();
  const before = serializer.serialize(session.document);
  new GroupCommand(session).execute(['bundle', 'b', 'a']);
  assert.equal(session.document.parentOf('bundle'), 'outer');
  assert.deepEqual(session.document.shape('outer').children.map((shape) => shape.id), ['bundle', 'left', 'right']);
  assert.deepEqual(session.document.shape('bundle').children.map((shape) => shape.id), ['a', 'b']);
  assert.deepEqual(session.document.shape('left').children.map((shape) => shape.id), ['left-remains']);
  assert.equal(session.document.shape('a').geometry.get('x'), 1);
  session.undo();
  assert.equal(serializer.serialize(session.document), before);
  session.redo();
  assert.equal(session.document.parentOf('b'), 'bundle');
});

test('group can contain a whole subtree and unrelated root, but rejects ancestor conflicts atomically', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'g']);
  create.execute(['g', 'child', 'in', 'g']);
  create.execute(['g', 'other']);
  create.execute(['g', 'redo']);
  session.undo();
  const serializer = new SvgSerializer();
  const before = serializer.serialize(session.document);
  const group = new GroupCommand(session);
  assert.throws(() => group.execute(['bad', 'child', 'g']), { message: 'cannot group a container into its own descendant: g' });
  assert.throws(() => group.execute(['bad', 'g', 'g']), /duplicate shape id: g/u);
  assert.throws(() => group.execute(['g', 'child', 'other']), /id already exists: g/u);
  assert.throws(() => group.execute(['bad', 'other', 'missing']), /no such shape: missing/u);
  assert.throws(() => group.execute(['bad', 'other']), /usage: group/u);
  assert.equal(serializer.serialize(session.document), before);
  session.redo();
  group.execute(['bundle', 'other', 'g']);
  assert.deepEqual(session.document.children.map((shape) => shape.id), ['bundle', 'redo']);
  assert.equal(session.document.parentOf('child'), 'g');
});

test('ungroup promotes children at exactly the old position and is a single reversible command', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'outer']);
  for (const id of ['before', 'inner', 'after']) { create.execute(['g', id, 'in', 'outer']); }
  create.execute(['g', 'a', 'in', 'inner']);
  create.execute(['g', 'b', 'in', 'inner']);
  const before = new SvgSerializer().serialize(session.document);
  const ungroup = new UngroupCommand(session);
  ungroup.execute(['inner']);
  assert.deepEqual(session.document.shape('outer').children.map((shape) => shape.id), ['before', 'a', 'b', 'after']);
  assert.equal(session.document.has('inner'), false);
  session.undo();
  assert.equal(new SvgSerializer().serialize(session.document), before);
  session.redo();
  ungroup.execute(['before']);
  assert.deepEqual(session.document.shape('outer').children.map((shape) => shape.id), ['a', 'b', 'after']);
});

test('ungroup follows the special top-level prohibition and rejects leaves without changing history', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'scene']);
  create.execute(['circle', 'leaf', '1', '2', '3']);
  const ungroup = new UngroupCommand(session);
  assert.throws(() => ungroup.execute(['scene']), { message: 'cannot ungroup top-level container: scene' });
  assert.throws(() => ungroup.execute(['leaf']), /not a container: leaf/u);
  assert.throws(() => ungroup.execute(['missing']), /no such shape: missing/u);
  session.undo();
  assert.equal(session.document.has('leaf'), false);
});

test('addto moves a subtree to the end, including a child already in the same container', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'source']);
  create.execute(['g', 'nested', 'in', 'source']);
  create.execute(['g', 'leaf', 'in', 'nested']);
  create.execute(['g', 'target']);
  create.execute(['g', 'first', 'in', 'target']);
  const before = new SvgSerializer().serialize(session.document);
  const add = new AddToCommand(session);
  add.execute(['target', 'source']);
  assert.deepEqual(session.document.shape('target').children.map((shape) => shape.id), ['first', 'source']);
  assert.equal(session.document.parentOf('leaf'), 'nested');
  session.undo();
  assert.equal(new SvgSerializer().serialize(session.document), before);
  session.redo();
  add.execute(['target', 'first']);
  assert.deepEqual(session.document.shape('target').children.map((shape) => shape.id), ['source', 'first']);
});

test('addto rejects self/descendant cycles and invalid containers while preserving redo', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'g']);
  create.execute(['g', 'nested', 'in', 'g']);
  create.execute(['circle', 'c', '1', '2', '3']);
  create.execute(['g', 'redo']);
  session.undo();
  const before = new SvgSerializer().serialize(session.document);
  const add = new AddToCommand(session);
  assert.throws(() => add.execute(['g', 'g']), /own descendant: g/u);
  assert.throws(() => add.execute(['nested', 'g']), /own descendant: g/u);
  assert.throws(() => add.execute(['c', 'g']), /not a container: c/u);
  assert.throws(() => add.execute(['missing', 'g']), /no such container: missing/u);
  assert.equal(new SvgSerializer().serialize(session.document), before);
  session.redo();
  assert.equal(session.document.has('redo'), true);
});

test('front/back change only sibling SVG paint order and undo restores it', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  for (const id of ['a', 'b', 'c']) { create.execute(['g', id]); }
  create.execute(['g', 'x', 'in', 'b']);
  create.execute(['g', 'y', 'in', 'b']);
  const before = new SvgSerializer().serialize(session.document);
  new FrontCommand(session).execute(['a']);
  assert.deepEqual(session.document.children.map((shape) => shape.id), ['b', 'c', 'a']);
  new BackCommand(session).execute(['y']);
  assert.deepEqual(session.document.shape('b').children.map((shape) => shape.id), ['y', 'x']);
  assert.deepEqual(session.document.children.map((shape) => shape.id), ['b', 'c', 'a']);
  session.undo();
  session.undo();
  assert.equal(new SvgSerializer().serialize(session.document), before);
  session.redo();
  session.redo();
  assert.equal(session.document.parentOf('y'), 'b');
});
