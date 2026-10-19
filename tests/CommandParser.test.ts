import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CommandParser } from '../src/cli/CommandParser.js';

const parser = new CommandParser();

test('preserves quoted text and container suffix', () => {
  assert.deepEqual(parser.parse('create text t1 20 40 "My Diagram 开始" in node1'), [
    'create', 'text', 't1', '20', '40', 'My Diagram 开始', 'in', 'node1',
  ]);
});

test('skips blank lines and full-line comments, including leading whitespace', () => {
  assert.deepEqual(parser.parse(' \t'), []);
  assert.deepEqual(parser.parse('  # comment'), []);
});

test('preserves SVG colors rather than stripping them as comments', () => {
  assert.deepEqual(parser.parse('set r1 fill #ffffff'), ['set', 'r1', 'fill', '#ffffff']);
  assert.deepEqual(parser.parse('set t1 text "# hello"'), ['set', 't1', 'text', '# hello']);
});

test('preserves empty text and a literal in inside quotes', () => {
  assert.deepEqual(parser.parse('set t1 text ""'), ['set', 't1', 'text', '']);
  assert.deepEqual(parser.parse('set t1 text "in"'), ['set', 't1', 'text', 'in']);
});

test('preserves Windows paths containing spaces', () => {
  assert.deepEqual(parser.parse('read "D:\\My Diagrams\\demo.svg"'), [
    'read', 'D:\\My Diagrams\\demo.svg',
  ]);
});

test('supports escaped quotes in text', () => {
  assert.deepEqual(parser.parse('set t1 text "say \\"hello\\""'), [
    'set', 't1', 'text', 'say "hello"',
  ]);
});

test('rejects an unterminated quote and accepts the next independent line', () => {
  assert.throws(() => parser.parse('set t1 text "broken'), /unterminated double quote/u);
  assert.deepEqual(parser.parse('help'), ['help']);
});
