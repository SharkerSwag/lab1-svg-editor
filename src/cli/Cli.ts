import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { EditorApplication } from '../application/EditorApplication.js';
import { CommandParser } from './CommandParser.js';

export class Cli {
  constructor(
    private readonly parser: CommandParser,
    private readonly application: EditorApplication,
  ) {}

  async run(input: Readable, output: Writable, interactive: boolean): Promise<void> {
    const lines = createInterface({ input, crlfDelay: Infinity, terminal: false });
    output.write("svg-editor 0.1 — type 'help' for commands\n");
    if (interactive) {
      output.write('svg> ');
    }

    try {
      for await (const line of lines) {
        try {
          const result = this.application.execute(this.parser.parse(line));
          if (result !== undefined) {
            output.write(`${result}\n`);
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'unexpected failure';
          output.write(`error: ${message.replace(/[\r\n]+/gu, ' ')}\n`);
        }
        if (interactive) {
          output.write('svg> ');
        }
      }
    } finally {
      lines.close();
    }
  }
}
