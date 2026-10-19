import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { CommandRegistry } from '../src/application/CommandRegistry.js';
import { EditorApplication } from '../src/application/EditorApplication.js';
import { EditorSession } from '../src/application/EditorSession.js';
import { AddToCommand } from '../src/commands/AddToCommand.js';
import { BackCommand } from '../src/commands/BackCommand.js';
import { CanvasCommand } from '../src/commands/CanvasCommand.js';
import { CreateCommand } from '../src/commands/CreateCommand.js';
import { DeleteCommand } from '../src/commands/DeleteCommand.js';
import { FrontCommand } from '../src/commands/FrontCommand.js';
import { GroupCommand } from '../src/commands/GroupCommand.js';
import { HelpCommand } from '../src/commands/HelpCommand.js';
import { InitCommand } from '../src/commands/InitCommand.js';
import { MoveCommand } from '../src/commands/MoveCommand.js';
import { ReadCommand } from '../src/commands/ReadCommand.js';
import { RedoCommand } from '../src/commands/RedoCommand.js';
import { SaveCommand } from '../src/commands/SaveCommand.js';
import { ScaleCommand } from '../src/commands/ScaleCommand.js';
import { SetCommand } from '../src/commands/SetCommand.js';
import { ShowCommand } from '../src/commands/ShowCommand.js';
import { TreeCommand } from '../src/commands/TreeCommand.js';
import { UndoCommand } from '../src/commands/UndoCommand.js';
import { UngroupCommand } from '../src/commands/UngroupCommand.js';
import { FileDocumentStorage } from '../src/io/FileDocumentStorage.js';
import { SvgReader } from '../src/io/SvgReader.js';
import { SvgSerializer } from '../src/io/SvgSerializer.js';
import type { Shape } from '../src/model/Shape.js';
import type { SvgDocument } from '../src/model/SvgDocument.js';

// Reproducible command sequences, checked against an independent history of XML states.
// This exercises combinations rather than repeating individual command implementations.
for (const seed of [1, 42, 20261019, 0xdeadbeef]) {
  test(`mixed commands preserve tree, IO and history invariants (seed ${seed})`, (t) => {
    const directory = mkdtempSync(join(tmpdir(), 'svg-state-'));
    t.after(() => rmSync(directory, { recursive: true, force: true }));
    const file = join(directory, '已保存的图.svg');
    const invalid = join(directory, 'invalid.svg');
    writeFileSync(invalid, '<svg><g></svg>');
    const session = new EditorSession(new FileDocumentStorage());
    const app = new EditorApplication(new CommandRegistry([
      new InitCommand(session), new CreateCommand(session), new DeleteCommand(session),
      new MoveCommand(session), new ScaleCommand(session), new SetCommand(session),
      new GroupCommand(session), new UngroupCommand(session), new AddToCommand(session),
      new FrontCommand(session), new BackCommand(session), new TreeCommand(session),
      new ShowCommand(session), new HelpCommand(), new CanvasCommand(session),
      new SaveCommand(session), new ReadCommand(session), new UndoCommand(session), new RedoCommand(session),
    ]));
    const serializer = new SvgSerializer();
    const reader = new SvgReader();
    const snapshot = (): string => serializer.serialize(session.document);
    let randomState = seed;
    const random = (limit: number): number => {
      randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
      return Math.floor(randomState / 0x100000000 * limit);
    };
    const flatten = (shapes: readonly Shape[]): Shape[] => shapes.flatMap((shape) => [shape, ...flatten(shape.children)]);
    const inspect = (document: SvgDocument): unknown => {
      const seen = new Set<string>();
      const visit = (shapes: readonly Shape[], parent?: string): unknown[] => shapes.map((shape, position) => {
        assert.equal(seen.has(shape.id), false, 'unique IDs');
        seen.add(shape.id);
        assert.equal(document.parentOf(shape.id), parent, 'parent index');
        assert.equal(document.positionOf(shape.id), position, 'sibling index');
        assert.equal(document.shape(shape.id).tag, shape.tag, 'shape index');
        return [shape.id, shape.tag, [...shape.geometry], [...shape.styles].sort(),
          [...shape.presentation].sort(), shape.text, visit(shape.children, shape.id)];
      });
      const tree = visit(document.children);
      assert.equal(seen.size, document.size, 'index contains exactly the live tree');
      return [document.width, document.height, tree];
    };
    app.execute(['init']);
    app.execute(['save', file]);
    let expected = snapshot();
    const undo: string[] = [];
    const redo: string[] = [];
    let blocked = true;
    let successes = 0;
    let failures = 0;
    let undos = 0;
    const trace: string[][] = [];
    for (let step = 0; step < 300; step += 1) {
      const shapes = flatten(session.document.children);
      const groups = shapes.filter((shape) => shape.tag === 'g');
      const target = shapes.length === 0 || random(8) === 0 ? 'missing' : shapes[random(shapes.length)]!.id;
      const group = groups.length === 0 ? 'missing' : groups[random(groups.length)]!.id;
      const id = `s${step}`;
      const creation = [
        ['g', id], ['rect', id, '1.5', '-2', '30', '40', '#abc'],
        ['circle', id, '10', '20', '5'], ['ellipse', id, '10', '20', '5', '3'],
        ['line', id, '1', '2', '30', '40', 'black'],
        ['text', id, '10', '20', `中文 😀 & <${step}> "引号"`],
      ][random(6)]!;
      const choices = [
        ['create', ...creation, ...(groups.length > 0 && random(2) === 0 ? ['in', group] : [])],
        ['create', 'g', target], ['move', target, String(random(11) - 5), String(random(11) - 5)],
        ['scale', target, ['0', '-1', '0.5', '2'][random(4)]!],
        ['set', target, ['fill', 'stroke', 'stroke-width', 'text', 'width', 'unknown'][random(6)]!, '2'],
        ['delete', target], ['group', id, target, shapes.length === 0 ? 'missing2' : shapes[random(shapes.length)]!.id],
        ['ungroup', group], ['addto', group, target], ['front', target], ['back', target],
        ['undo'], ['redo'], ['tree'], ['show', target], ['help'], ['canvas'],
        ['canvas', '640', String(random(2) === 0 ? 480 : -1)],
        ['save', random(3) === 0 ? join(directory, 'missing', 'bad.svg') : file],
        ['read', random(2) === 0 ? invalid : file],
      ];
      const tokens = choices[random(choices.length)]!;
      trace.push(tokens);
      const beforePath = session.associatedPath;
      let error: unknown;
      try { app.execute(tokens); } catch (caught) { error = caught; }
      try {
        const name = tokens[0]!;
        if (name === 'undo' || name === 'redo') {
          const source = name === 'undo' ? undo : redo;
          const destination = name === 'undo' ? redo : undo;
          if (blocked || source.length === 0) {
            assert.ok(error instanceof Error);
            assert.equal(error.message, blocked ? 'undo not allowed after io command' : `nothing to ${name}`);
          } else {
            assert.equal(error, undefined);
            destination.push(expected);
            expected = source.pop()!;
            undos += 1;
          }
        } else if (error !== undefined) {
          assert.equal(session.associatedPath, beforePath, 'failed command preserves path');
          failures += 1;
        } else if (['tree', 'show', 'help'].includes(name) || (name === 'canvas' && tokens.length === 1)) {
          // Queries leave both history stacks and the barrier unchanged.
        } else if (['init', 'read', 'save', 'canvas'].includes(name)) {
          expected = snapshot();
          undo.length = 0;
          redo.length = 0;
          blocked = true;
        } else {
          undo.push(expected);
          redo.length = 0;
          expected = snapshot();
          blocked = false;
          successes += 1;
        }
        assert.equal(snapshot(), expected, 'exact document state');
        const loaded = reader.read(snapshot());
        assert.deepEqual(loaded.warnings, []);
        assert.deepEqual(inspect(loaded.document), inspect(session.document), 'round-trip state');
      } catch (assertion) {
        throw new Error(`seed=${seed}, step=${step}, trace=${JSON.stringify(trace)}`, { cause: assertion });
      }
    }
    assert.ok(successes > 30 && failures > 20 && undos > 0, 'sequence must exercise edits, failures and history');
    t.diagnostic(`300 commands: ${successes} successful edits, ${failures} rejected operations, ${undos} undo/redo operations`);
    // Drain the surviving branch completely, then replay it; do not rely on random undo frequency.
    while (undo.length > 0) {
      app.execute(['undo']);
      redo.push(expected);
      expected = undo.pop()!;
      assert.equal(snapshot(), expected);
    }
    while (redo.length > 0) {
      app.execute(['redo']);
      expected = redo.pop()!;
      assert.equal(snapshot(), expected);
    }
  });
}
