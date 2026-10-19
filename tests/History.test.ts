import assert from 'node:assert/strict';
import { test } from 'node:test';
import { History } from '../src/commands/History.js';

test('failed undo and redo retain their stack entries for a later retry', () => {
  const history = new History();
  let failUndo = true;
  let failRedo = false;
  let present = false;
  history.perform({
    execute: () => {
      if (failRedo) { throw new Error('redo failed before mutation'); }
      present = true;
      return 'added';
    },
    undo: () => {
      if (failUndo) { throw new Error('undo failed before mutation'); }
      present = false;
      return 'removed';
    },
  });
  assert.throws(() => history.undo(), /undo failed/u);
  assert.equal(present, true);
  failUndo = false;
  assert.equal(history.undo(), 'removed');
  failRedo = true;
  assert.throws(() => history.redo(), /redo failed/u);
  assert.equal(present, false);
  failRedo = false;
  assert.equal(history.redo(), 'added');
});
