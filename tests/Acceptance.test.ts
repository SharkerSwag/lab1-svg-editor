import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { SvgReader } from '../src/io/SvgReader.js';

test('complete assignment transcript produces the expected SVG and only the two intentional errors', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-acceptance-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, 'output'));
  mkdirSync(join(directory, 'examples'));
  writeFileSync(join(directory, 'examples', 'other.svg'), readFileSync('examples/other.svg'));
  const input = readFileSync('examples/assignment-session.txt', 'utf8');
  const output = execFileSync(process.execPath, [resolve('dist/src/main.js')], { cwd: directory, input, encoding: 'utf8' });
  assert.deepEqual(output.split('\n').filter((line) => line.startsWith('error:')), [
    'error: cannot group a container into its own descendant: markers',
    'error: undo not allowed after io command',
  ]);
  assert.match(output, /warning: assigned id rect1 to unnamed <rect>/u);
  assert.match(output, /read examples\/other.svg \(7 elements\)/u);
  const saved = new SvgReader().read(readFileSync(join(directory, 'output', 'demo.svg'), 'utf8')).document;
  assert.equal(saved.size, 5);
  assert.equal(saved.shape('title').text, 'My Diagram');
  assert.equal(saved.shape('c1').geometry.get('cx'), 130);
  assert.equal(saved.parentOf('box'), 'markers');
  assert.deepEqual(saved.children.map((shape) => shape.id), ['bg', 'title', 'markers']);
});

test('complete flowchart case A saves eight elements after container move/undo and text update', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-flowchart-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, 'output'));
  const input = readFileSync('examples/flowchart-full.txt', 'utf8');
  const output = execFileSync(process.execPath, [resolve('dist/src/main.js')], { cwd: directory, input, encoding: 'utf8' });
  assert.doesNotMatch(output, /^error:/mu);
  assert.match(output, /saved to output\/flowchart-full.svg \(8 elements\)/u);
  const saved = new SvgReader().read(readFileSync(join(directory, 'output', 'flowchart-full.svg'), 'utf8')).document;
  assert.equal(saved.size, 8);
  assert.equal(saved.shape('process').geometry.get('y'), 100);
  assert.equal(saved.shape('process-label').text, '处理数据 v2');
  assert.equal(saved.parentOf('process-label'), 'node2');
  assert.equal(saved.parentOf('arrow1'), 'flowchart');
});

test('Chinese hands-on guide replays all commands and saves the stated final drawing', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'svg-hands-on-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, 'output'));
  const input = /```text\r?\n([\s\S]*?)```/u.exec(readFileSync('doc/动手验收.md', 'utf8'))?.[1];
  assert.ok(input, 'guide contains a runnable CLI transcript');
  const output = execFileSync(process.execPath, [resolve('dist/src/main.js')], { cwd: directory, input, encoding: 'utf8' });
  assert.deepEqual(output.split('\n').filter((line) => line.startsWith('error:')), [
    'error: undo not allowed after io command',
    'error: unknown shape type: box (is the plugin loaded?)',
    'error: scale factor must be positive',
  ]);
  const saved = new SvgReader().read(readFileSync(join(directory, 'output', '动手验收.svg'), 'utf8')).document;
  assert.equal(saved.size, 7);
  assert.equal(saved.width, 800);
  assert.equal(saved.height, 400);
  assert.equal(saved.shape('title').text, '分组、撤销与读写验收');
  assert.deepEqual([...saved.shape('r').geometry.values()], [30, 50, 80, 40]);
  assert.equal(saved.has('pair'), false);
  assert.equal(saved.parentOf('r'), 'scene');
  assert.equal(saved.parentOf('e'), 'details');
  assert.deepEqual(saved.shape('scene').children.map((shape) => shape.id), ['c', 'r', 'l', 'title', 'details']);
});
