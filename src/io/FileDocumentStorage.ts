import { randomUUID } from 'node:crypto';
import { closeSync, openSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import type { DocumentStorage } from '../model/DocumentStorage.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { SvgSerializer } from './SvgSerializer.js';

export class FileDocumentStorage implements DocumentStorage {
  constructor(private readonly serializer = new SvgSerializer()) {}

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
