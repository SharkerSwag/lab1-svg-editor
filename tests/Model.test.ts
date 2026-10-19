import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Circle } from '../src/model/Circle.js';
import { Group } from '../src/model/Group.js';
import { Rect } from '../src/model/Rect.js';
import { ShapeFactory } from '../src/model/ShapeFactory.js';
import { SvgDocument } from '../src/model/SvgDocument.js';

test('factory creates all six types with precise geometry and optional styling', () => {
  const factory = new ShapeFactory();
  const shapes = [
    factory.create('rect', 'r', ['-1.5', '2e1', '0', '4', '#fff']),
    factory.create('circle', 'c', ['1', '2', '3']),
    factory.create('ellipse', 'e', ['1', '2', '3', '4', 'red']),
    factory.create('line', 'l', ['-1', '2', '3', '4', 'black']),
    factory.create('text', 't', ['1', '2', '中文 in #ffffff']),
    factory.create('g', 'g', []),
  ];
  assert.deepEqual(shapes.map((shape) => shape.tag), ['rect', 'circle', 'ellipse', 'line', 'text', 'g']);
  assert.equal(shapes[0]!.geometry.get('x'), -1.5);
  assert.equal(shapes[0]!.geometry.get('y'), 20);
  assert.equal(shapes[0]!.styles.get('fill'), '#fff');
  assert.equal(shapes[1]!.styles.size, 0);
  assert.equal(shapes[3]!.styles.get('stroke'), 'black');
  assert.equal(shapes[4]!.text, '中文 in #ffffff');
  for (const shape of shapes) {
    assert.notEqual(shape.clone(), shape);
    assert.equal(shape.clone().summary, shape.summary);
  }
});

test('factory rejects unknown types, malformed numbers and incorrect arity', () => {
  const factory = new ShapeFactory();
  assert.throws(() => factory.create('box', 'b', []), /unknown shape type: box \(is the plugin loaded\?\)/u);
  for (const invalid of ['', ' ', 'NaN', 'Infinity', '1e999', '0x10', '1px']) {
    assert.throws(() => factory.create('circle', 'c', [invalid, '2', '3']), /finite number/u);
  }
  assert.throws(() => factory.create('rect', 'r', ['1', '2', '3']), /usage: create rect/u);
  assert.throws(() => factory.create('g', 'g', ['unexpected']), /usage: create g/u);
});

test('model enforces identifiers, dimensions, radii and finite coordinates', () => {
  assert.throws(() => new Group(''), /id must/u);
  assert.throws(() => new Group('a b'), /id must/u);
  assert.throws(() => new Rect('r', 0, 0, -1, 2), /width must be non-negative/u);
  assert.throws(() => new Circle('c', 0, 0, -1), /r must be non-negative/u);
  assert.throws(() => new Circle('c', Infinity, 0, 1), /cx must be a finite/u);
  assert.equal(new Circle('c', 0, 0, 0).geometry.get('r'), 0);
});

test('document tracks nested parents, case-sensitive ids and subtree removal', () => {
  const document = new SvgDocument();
  document.add(new Group('scene'));
  document.add(new Group('node'), 'scene');
  document.add(new Rect('r', 1, 2, 3, 4), 'node');
  document.add(new Circle('R', 1, 2, 3));
  assert.equal(document.size, 4);
  assert.equal(document.parentOf('r'), 'node');
  assert.equal(document.parentOf('scene'), undefined);
  assert.equal(document.shape('scene').children[0]!.children[0]!.id, 'r');
  document.remove('node');
  assert.equal(document.size, 2);
  assert.equal(document.shape('scene').children.length, 0);
  assert.throws(() => document.shape('r'), /no such shape: r/u);
  document.add(new Rect('r', 0, 0, 1, 1), 'scene');
  assert.equal(document.parentOf('r'), 'scene');
});

test('failed insertions leave the document unchanged and do not reserve ids', () => {
  const document = new SvgDocument();
  document.add(new Rect('r', 0, 0, 1, 1));
  assert.throws(() => document.add(new Group('r')), /id already exists: r/u);
  assert.throws(() => document.add(new Group('g'), 'missing'), /no such container: missing/u);
  assert.throws(() => document.add(new Group('g'), 'r'), /not a container: r/u);
  assert.equal(document.size, 1);
  document.add(new Group('g'));
  assert.equal(document.size, 2);
});

test('incoming and outgoing shapes cannot mutate the owned document tree', () => {
  const document = new SvgDocument();
  const group = new Group('g');
  document.add(group);
  group.insert(new Circle('external', 1, 2, 3));
  document.shape('g').asGroup().insert(new Circle('copy', 1, 2, 3));
  document.children[0]!.asGroup().insert(new Circle('root-copy', 1, 2, 3));
  assert.equal(document.size, 1);
  assert.equal(document.shape('g').children.length, 0);
});

test('duplicate ids anywhere in a supplied subtree are rejected atomically', () => {
  const group = new Group('g');
  const nested = new Group('nested');
  nested.insert(new Circle('same', 1, 2, 3));
  group.insert(nested);
  group.insert(new Rect('same', 1, 2, 3, 4));
  const document = new SvgDocument();
  assert.throws(() => document.add(group), /id already exists: same/u);
  assert.equal(document.size, 0);
  assert.equal(document.children.length, 0);
});

test('groups reject structural cycles and clone entire subtrees', () => {
  const outer = new Group('outer');
  const inner = new Group('inner');
  outer.insert(inner);
  assert.throws(() => inner.insert(outer), /own descendant/u);
  assert.throws(() => outer.insert(outer), /own descendant/u);
  const copy = outer.clone();
  assert.notEqual(copy.children[0], outer.children[0]);
});

test('canvas resize validates both dimensions before changing either', () => {
  const document = new SvgDocument(400, 300);
  assert.throws(() => document.resize(900, -1), /canvas height must be positive/u);
  assert.equal(document.width, 400);
  assert.equal(document.height, 300);
  document.resize(640.5, 480);
  assert.equal(document.width, 640.5);
  assert.equal(document.height, 480);
});
