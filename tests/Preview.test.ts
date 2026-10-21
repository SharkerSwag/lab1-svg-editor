import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Script } from 'node:vm';
import { get } from 'node:http';
import { EditorSession } from '../src/application/EditorSession.js';
import { CreateCommand } from '../src/commands/CreateCommand.js';
import { InitCommand } from '../src/commands/InitCommand.js';
import { MoveCommand } from '../src/commands/MoveCommand.js';
import { LivePreview } from '../src/io/LivePreview.js';
import { PreviewPage } from '../src/io/PreviewPage.js';
import { PreviewSnapshot } from '../src/io/PreviewSnapshot.js';

test('preview page contains valid JavaScript and keeps untrusted drawing content out of HTML', () => {
  const html = new PreviewPage().render('test-nonce');
  const script = /<script[^>]*>([\s\S]*?)<\/script>/u.exec(html)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new Script(script));
  assert.match(html, /nonce="test-nonce"/u);
  assert.doesNotMatch(script, /innerHTML|outerHTML|document\.write/u);
  assert.match(script, /textContent/u);
});

test('snapshot handles no document, Unicode text, unsaved state and unsupported preview characters', () => {
  const session = new EditorSession();
  const snapshot = new PreviewSnapshot(session);
  assert.equal(JSON.parse(snapshot.capture()).svg, '');
  new InitCommand(session).execute([]);
  new CreateCommand(session).execute(['text', 't', '10', '20', '</script> 中文 <&>']);
  const valid = JSON.parse(snapshot.capture());
  assert.equal(valid.dirty, true);
  assert.equal(valid.count, 1);
  assert.match(valid.svg, /&lt;\/script&gt; 中文 &lt;&amp;&gt;/u);
  new CreateCommand(session).execute(['text', 'invalid', '0', '0', '\u0000']);
  const invalid = JSON.parse(snapshot.capture());
  assert.equal(invalid.svg, '');
  assert.match(invalid.error, /XML/u);
  session.undo();
  assert.equal(JSON.parse(snapshot.capture()).error, '');
});

test('preview serves only its local read-only endpoints, with current state and browser policy', async (t) => {
  const session = new EditorSession();
  const preview = new LivePreview(session);
  const url = await preview.start();
  t.after(() => preview.close());
  assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/$/u);
  await assert.rejects(preview.start(), /already running/u);
  const page = await fetch(url);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy')!, /default-src 'none'/u);
  assert.equal(page.headers.get('cache-control'), 'no-store');
  assert.match(await page.text(), /实时画布/u);
  assert.equal((await fetch(url + 'state')).status, 200);
  assert.equal((await fetch(url + 'state', { headers: { Origin: 'https://other.example' } })).status, 403);
  // Native fetch normalizes Host; use HTTP directly to exercise the actual hostile header.
  const hostileHost = await new Promise<number | undefined>((resolve, reject) => {
    get(url, { headers: { Host: 'other.example' } }, (response) => {
      response.resume(); resolve(response.statusCode);
    }).on('error', reject);
  });
  assert.equal(hostileHost, 403);
  const malformedUrl = await new Promise<number | undefined>((resolve, reject) => {
    get(url, { path: 'http://[' }, (response) => {
      response.resume(); resolve(response.statusCode);
    }).on('error', reject);
  });
  assert.equal(malformedUrl, 400);
  assert.equal((await fetch(url + 'state', { method: 'POST' })).status, 405);
  assert.equal((await fetch(url + 'not-a-file.svg')).status, 404);
  new InitCommand(session).execute([]);
  new CreateCommand(session).execute(['rect', 'r', '1', '2', '3', '4']);
  const current = await (await fetch(url + 'state')).json() as { svg: string; count: number };
  assert.equal(current.count, 1);
  assert.match(current.svg, /id="r"/u);
  session.undo();
  assert.equal(session.document.size, 0, 'serving preview state must not introduce a history barrier');
});

test('SSE sends initial and edited/undone states, and clean shutdown closes connected clients', async (t) => {
  const session = new EditorSession();
  new InitCommand(session).execute([]);
  new CreateCommand(session).execute(['rect', 'r', '1', '2', '3', '4']);
  const preview = new LivePreview(session);
  const url = await preview.start();
  t.after(() => preview.close());
  const abort = new AbortController();
  t.after(() => abort.abort());
  const stream = await fetch(url + 'events', { signal: abort.signal });
  const reader = stream.body!.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  const next = async (): Promise<{ svg: string }> => {
    while (!pending.includes('\n\n')) {
      const chunk = await reader.read();
      assert.equal(chunk.done, false);
      pending += decoder.decode(chunk.value, { stream: true });
    }
    const end = pending.indexOf('\n\n');
    const frame = pending.slice(0, end);
    pending = pending.slice(end + 2);
    return JSON.parse(frame.slice('data: '.length)) as { svg: string };
  };
  assert.match((await next()).svg, /x="1"/u);
  new MoveCommand(session).execute(['r', '20', '0']);
  preview.publish();
  assert.match((await next()).svg, /x="21"/u);
  session.undo();
  preview.publish();
  assert.match((await next()).svg, /x="1"/u);
  session.redo();
  assert.equal(session.document.shape('r').geometry.get('x'), 21);
  await preview.close();
  assert.equal((await reader.read()).done, true);
  await assert.rejects(fetch(url));
  await preview.close();
});
