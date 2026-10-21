import { randomBytes } from 'node:crypto';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type { DocumentView } from '../model/DocumentView.js';
import { PreviewPage } from './PreviewPage.js';
import { PreviewSnapshot } from './PreviewSnapshot.js';

/** A read-only, loopback-only adapter. Publishing never saves or touches history. */
export class LivePreview {
  private server: Server | undefined;
  private address: string | undefined;
  private readonly clients = new Set<ServerResponse>();
  private readonly snapshot: PreviewSnapshot;
  private readonly nonce = randomBytes(18).toString('base64');
  private lastState = '';
  private heartbeat: ReturnType<typeof setInterval> | undefined;

  constructor(view: DocumentView) { this.snapshot = new PreviewSnapshot(view); }

  get url(): string {
    if (this.address === undefined) { throw new Error('preview is not running'); }
    return this.address;
  }

  async start(): Promise<string> {
    if (this.server !== undefined) { throw new Error('preview is already running'); }
    const server = createServer((request, response) => this.respond(request, response));
    this.server = server;
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
      });
    } catch (error) { this.server = undefined; throw error; }
    const address = server.address();
    if (address === null || typeof address === 'string') { throw new Error('cannot determine preview port'); }
    this.address = `http://127.0.0.1:${address.port}/`;
    this.lastState = this.snapshot.capture();
    this.heartbeat = setInterval(() => {
      for (const client of this.clients) { client.write(': keepalive\n\n'); }
    }, 15000);
    this.heartbeat.unref();
    return this.url;
  }

  publish(): void {
    const state = this.snapshot.capture();
    if (state === this.lastState) { return; }
    this.lastState = state;
    for (const client of this.clients) {
      if (client.writableLength > 1024 * 1024) { client.destroy(); }
      else { client.write(`data: ${state}\n\n`); }
    }
  }

  async close(): Promise<void> {
    if (this.heartbeat !== undefined) { clearInterval(this.heartbeat); this.heartbeat = undefined; }
    for (const client of this.clients) { client.end(); }
    this.clients.clear();
    const server = this.server;
    this.server = undefined;
    this.address = undefined;
    if (server !== undefined) {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
        server.closeAllConnections();
      });
    }
  }

  private respond(request: IncomingMessage, response: ServerResponse): void {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (this.address === undefined || request.headers.host !== new URL(this.address).host
      || (request.headers.origin !== undefined && request.headers.origin !== new URL(this.address).origin)) {
      response.writeHead(403).end('Forbidden'); return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.writeHead(405, { Allow: 'GET, HEAD' }).end('Read-only preview'); return;
    }
    let path: string;
    try { path = new URL(request.url ?? '/', this.address).pathname; }
    catch { response.writeHead(400).end('Invalid URL'); return; }
    if (path === '/') {
      response.setHeader('Content-Security-Policy', `default-src 'none'; script-src 'nonce-${this.nonce}'; style-src 'unsafe-inline'; connect-src 'self'; img-src blob:; base-uri 'none'; frame-ancestors 'none'`);
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(new PreviewPage().render(this.nonce));
    } else if (path === '/state') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' }).end(this.snapshot.capture());
    } else if (path === '/events' && request.method === 'GET') {
      response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', Connection: 'keep-alive' });
      response.write(`data: ${this.snapshot.capture()}\n\n`);
      this.clients.add(response);
      response.on('close', () => this.clients.delete(response));
      response.on('error', () => { this.clients.delete(response); response.destroy(); });
    } else if (path === '/favicon.ico') { response.writeHead(204).end(); }
    else { response.writeHead(404).end('Not found'); }
  }
}
