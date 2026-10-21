import { readFileSync } from 'node:fs';
import { TextDecoder } from 'node:util';

export class CommandFile {
  read(file: string): string {
    try { return new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(file)); }
    catch { throw new Error(`cannot read command file: ${file}`); }
  }
}
