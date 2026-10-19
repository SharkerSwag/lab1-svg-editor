import { randomUUID } from 'node:crypto';
import { closeSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { TextDecoder } from 'node:util';
import type { DocumentStorage } from '../model/DocumentStorage.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import type { LoadedDocument } from '../model/LoadedDocument.js';
import { SvgSerializer } from './SvgSerializer.js';
import { SvgReader } from './SvgReader.js';

export class FileDocumentStorage implements DocumentStorage {
  constructor(private readonly serializer = new SvgSerializer(), private readonly reader = new SvgReader()) {}

  read(file: string): LoadedDocument {
    let xml: string;
    try { xml = new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(file)); }
    catch { throw new Error(`cannot read file: ${file}`); }
    try { return this.reader.read(xml); }
    catch (error: unknown) {
      const detail = error instanceof Error ? ` (${error.message})` : '';
      throw new Error(`cannot read file: ${file}${detail}`);
    }
  }

  save(document: SvgDocument, file: string): void {
    let temporary: string | undefined;
    let descriptor: number | undefined;
    let created = false;
    try {
      const xml = this.serializer.serialize(document);
      temporary = join(dirname(file), `.${basename(file)}.${randomUUID()}.tmp`);
      descriptor = openSync(temporary, 'wx');
      created = true;
      writeFileSync(descriptor, xml, 'utf8');
      closeSync(descriptor);
      descriptor = undefined;
      renameSync(temporary, file);
      temporary = undefined;
    } catch {
      throw new Error(`cannot write file: ${file}`);
    } finally {
      if (descriptor !== undefined) {
        try { closeSync(descriptor); } catch { /* Preserve the original write error. */ }
      }
      if (temporary !== undefined && created) {
        try { unlinkSync(temporary); } catch { /* The failed write may not have created a file. */ }
      }
    }
  }
}
