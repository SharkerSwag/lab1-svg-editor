import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EditorSession } from '../src/application/EditorSession.js';
import { CreateCommand } from '../src/commands/CreateCommand.js';
import { DeleteCommand } from '../src/commands/DeleteCommand.js';
import { InitCommand } from '../src/commands/InitCommand.js';
import { MoveCommand } from '../src/commands/MoveCommand.js';
import { ScaleCommand } from '../src/commands/ScaleCommand.js';
import { SetCommand } from '../src/commands/SetCommand.js';
import { SvgSerializer } from '../src/io/SvgSerializer.js';
import { Circle } from '../src/model/Circle.js';
import { Group } from '../src/model/Group.js';
import { Rect } from '../src/model/Rect.js';
import { ShapeFactory } from '../src/model/ShapeFactory.js';
import { SvgDocument } from '../src/model/SvgDocument.js';

test('each leaf moves and scales polymorphically without changing its original value', () => {
  const factory = new ShapeFactory();
  const shapes = [
    factory.create('rect', 'r', ['1', '2', '3', '4', 'red']),
    factory.create('circle', 'c', ['1', '2', '3']),
    factory.create('ellipse', 'e', ['1', '2', '3', '4']),
    factory.create('line', 'l', ['1', '2', '3', '4', 'black']),
    factory.create('text', 't', ['1', '2', 'hello']),
  ];
  const horizontal = new Set(['x', 'cx', 'x1', 'x2']);
  const vertical = new Set(['y', 'cy', 'y1', 'y2']);
  for (const shape of shapes) {
    const before = shape.summary;
    const moved = shape.moved(10, -5);
    const scaled = shape.scaled(2);
    for (const [key, value] of shape.geometry) {
      const offset = horizontal.has(key) ? 10 : vertical.has(key) ? -5 : 0;
      assert.equal(moved.geometry.get(key), value + offset);
      assert.equal(scaled.geometry.get(key), value * 2);
    }
    assert.equal(shape.summary, before);
    assert.deepEqual(moved.styles, shape.styles);
    assert.deepEqual(scaled.styles, shape.styles);
    assert.equal(moved.text, shape.text);
  }
});

test('nested groups transform their whole subtree and preserve all styles', () => {
  const outer = new Group('outer');
  const inner = new Group('inner');
  inner.insert(new Circle('c', 10, 20, 5).withAttribute('stroke-width', '2'));
  outer.insert(inner);
  outer.insert(new Rect('r', 1, 2, 3, 4, 'red'));
  const styled = outer.withAttribute('fill', 'blue');
  const moved = styled.moved(3, 4);
  const scaled = moved.scaled(0.5);
  assert.equal(scaled.children[0]!.children[0]!.geometry.get('cx'), 6.5);
  assert.equal(scaled.children[0]!.children[0]!.geometry.get('cy'), 12);
  assert.equal(scaled.children[0]!.children[0]!.geometry.get('r'), 2.5);
  assert.equal(scaled.children[0]!.children[0]!.styles.get('stroke-width'), '2');
  assert.equal(scaled.styles.get('fill'), 'blue');
  assert.equal(scaled.children[1]!.styles.get('fill'), 'red');
  assert.equal(outer.children[0]!.children[0]!.geometry.get('cx'), 10);
});

test('set supports exact geometry and common-style whitelists without leaking mutable maps', () => {
  const factory = new ShapeFactory();
  const shape = factory.create('rect', 'r', ['1', '2', '3', '4'])
    .withAttribute('width', '8').withAttribute('stroke', 'black').withAttribute('stroke-width', '1.5');
  assert.equal(shape.geometry.get('width'), 8);
  assert.equal(shape.styles.get('stroke'), 'black');
  assert.equal(shape.clone().styles.get('stroke-width'), '1.5');
  assert.throws(() => shape.withAttribute('r', '1'), /unknown attribute: r/u);
  assert.throws(() => shape.withAttribute('id', 'new'), /unknown attribute: id/u);
  assert.throws(() => shape.withAttribute('onclick', 'anything'), /unknown attribute: onclick/u);
  assert.throws(() => shape.withAttribute('width', '-1'), /width must be non-negative/u);
  assert.throws(() => shape.withAttribute('stroke-width', '-1'), /stroke-width must be non-negative/u);
  assert.throws(() => new Group('g').withAttribute('x', '1'), /unknown attribute: x/u);
  const text = factory.create('text', 't', ['1', '2', 'old']).withAttribute('text', 'new & <value>');
  assert.equal(text.text, 'new & <value>');
});

test('editing commands undo and redo exact geometry, styles, text and tree order', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  const serializer = new SvgSerializer();
  const states = [serializer.serialize(session.document)];
  const steps = [
    () => create.execute(['g', 'g']),
    () => create.execute(['rect', 'r', '1', '2', '3', '4', 'in', 'g']),
    () => create.execute(['text', 't', '5', '6', 'old', 'in', 'g']),
    () => new MoveCommand(session).execute(['g', '10', '20']),
    () => new ScaleCommand(session).execute(['g', '2']),
    () => new SetCommand(session).execute(['r', 'stroke-width', '2']),
    () => new SetCommand(session).execute(['t', 'text', 'new 中文']),
    () => new DeleteCommand(session).execute(['g']),
  ];
  for (const step of steps) { step(); states.push(serializer.serialize(session.document)); }
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    session.undo();
    assert.equal(serializer.serialize(session.document), states[index]);
  }
  for (let index = 1; index <= steps.length; index += 1) {
    session.redo();
    assert.equal(serializer.serialize(session.document), states[index]);
  }
});

test('delete restores all descendants and original positions as one undo unit', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'before']);
  create.execute(['g', 'g']);
  create.execute(['g', 'nested', 'in', 'g']);
  create.execute(['circle', 'c', '1', '2', '3', 'in', 'nested']);
  create.execute(['g', 'after']);
  new DeleteCommand(session).execute(['g']);
  assert.equal(session.document.size, 2);
  session.undo();
  assert.deepEqual(session.document.children.map((shape) => shape.id), ['before', 'g', 'after']);
  assert.equal(session.document.parentOf('c'), 'nested');
  assert.equal(session.document.size, 5);
  session.redo();
  assert.equal(session.document.has('c'), false);
});

test('late overflow during a composite edit leaves every node and redo unchanged', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['g', 'g']);
  create.execute(['circle', 'small', '1', '2', '3', 'in', 'g']);
  create.execute(['circle', 'large', '1e308', '2', '3', 'in', 'g']);
  create.execute(['g', 'redo-target']);
  session.undo();
  const before = new SvgSerializer().serialize(session.document);
  assert.throws(() => new ScaleCommand(session).execute(['g', '10']), /finite number/u);
  assert.equal(new SvgSerializer().serialize(session.document), before);
  assert.throws(() => new MoveCommand(session).execute(['g', '1e308', '0']), /finite number/u);
  assert.equal(new SvgSerializer().serialize(session.document), before);
  session.redo();
  assert.equal(session.document.has('redo-target'), true);
});

test('all invalid edit commands preserve history and enforce positive scale factors', () => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  const create = new CreateCommand(session);
  create.execute(['circle', 'c', '1', '2', '3']);
  create.execute(['g', 'redo-target']);
  session.undo();
  const before = new SvgSerializer().serialize(session.document);
  for (const factor of ['0', '-1']) {
    assert.throws(() => new ScaleCommand(session).execute(['c', factor]), { message: 'scale factor must be positive' });
  }
  assert.throws(() => new SetCommand(session).execute(['c', 'width', '2']), /unknown attribute: width/u);
  assert.throws(() => new SetCommand(session).execute(['c', 'r', '-2']), /non-negative/u);
  assert.throws(() => new MoveCommand(session).execute(['missing', '1', '2']), /no such shape: missing/u);
  assert.throws(() => new DeleteCommand(session).execute(['missing']), /no such shape: missing/u);
  assert.throws(() => new MoveCommand(session).execute(['c', '1']), /usage: move/u);
  assert.equal(new SvgSerializer().serialize(session.document), before);
  session.redo();
  assert.equal(session.document.has('redo-target'), true);
});

test('document replacement rejects conflicting subtree ids without disturbing the original', () => {
  const document = new SvgDocument();
  document.add(new Group('g'));
  document.add(new Circle('other', 1, 2, 3));
  const replacement = new Group('g');
  replacement.insert(new Circle('other', 4, 5, 6));
  const before = new SvgSerializer().serialize(document);
  assert.throws(() => document.replace('g', replacement), /id already exists: other/u);
  assert.equal(new SvgSerializer().serialize(document), before);
});
