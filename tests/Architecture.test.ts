import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { test } from 'node:test';
import { HelpCommand } from '../src/commands/HelpCommand.js';

const sources = readdirSync('src', { recursive: true, encoding: 'utf8' }).filter((name) => name.endsWith('.ts')).map((name) => join('src', name));

test('production imports follow the documented package dependency directions', () => {
  const allowed: Readonly<Record<string, ReadonlySet<string>>> = {
    cli: new Set(['cli', 'application']),
    application: new Set(['application', 'commands', 'model']),
    commands: new Set(['commands', 'model']),
    io: new Set(['io', 'model']),
    model: new Set(['model']),
  };
  for (const path of sources) {
    const module = relative('src', path).replaceAll('\\', '/').split('/')[0]!;
    if (module === 'main.ts') { continue; }
    const source = readFileSync(path, 'utf8');
    for (const match of source.matchAll(/^import\s+(?:type\s+)?[\s\S]*?\sfrom\s+['"]([^'"]+)['"]/gmu)) {
      const dependency = match[1]!;
      if (dependency.startsWith('.')) {
        const target = relative(resolve('src'), resolve(dirname(path), dependency)).replaceAll('\\', '/').split('/')[0]!;
        assert.ok(allowed[module]!.has(target), `${path} may not depend on ${target}`);
      } else {
        assert.ok(module === 'io' || (module === 'cli' && dependency.startsWith('node:')), `${path} has unexpected external dependency ${dependency}`);
      }
    }
  }
});

test('production classes are one per matching file, with type switches confined to ShapeFactory', () => {
  for (const path of sources) {
    const source = readFileSync(path, 'utf8');
    const classes = [...source.matchAll(/^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/gmu)];
    assert.ok(classes.length <= 1, `${path} contains multiple classes`);
    for (const declaration of classes) { assert.equal(declaration[1], basename(path, '.ts')); }
    assert.doesNotMatch(source, /^(?:export\s+)?(?:async\s+)?function\s+/mu, `${path} contains a free top-level function`);
    if (/\bswitch\s*\(/u.test(source)) { assert.equal(basename(path), 'ShapeFactory.ts'); }
  }
});

test('all nineteen required CLI commands are registered and documented in help', () => {
  const required = ['help', 'init', 'read', 'save', 'canvas', 'create', 'delete', 'move', 'scale', 'set', 'group', 'ungroup', 'addto', 'front', 'back', 'tree', 'show', 'undo', 'redo'];
  const main = readFileSync('src/main.ts', 'utf8');
  const registrations = [...main.matchAll(/new (\w+)Command\(/gu)].map((match) => match[1]!.toLowerCase());
  const help = [...new HelpCommand().execute([]).matchAll(/^ {2}([a-z]+)(?:\s|$)/gmu)].map((match) => match[1]!);
  assert.deepEqual(new Set(registrations), new Set(required));
  assert.deepEqual(new Set(help), new Set(required));
  assert.equal(registrations.length, required.length);
});
