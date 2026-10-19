import type { Element, Node } from '@xmldom/xmldom';
import { XmlEscaper } from './XmlEscaper.js';

/** XML 1.0 character checks in addition to the parser's structural validation. */
export class XmlValidator {
  private readonly characters = new XmlEscaper();

  source(source: string): void {
    this.characters.validate(source);
    // Character references are inactive in comments, CDATA and processing instructions.
    const active = source.replace(/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>/gu, '');
    const remainder = active.replace(/&(?:amp|lt|gt|quot|apos|#(?:x([0-9a-fA-F]+)|([0-9]+)));/gu,
      (reference: string, hex: string | undefined, decimal: string | undefined) => {
        if (hex !== undefined || decimal !== undefined) {
          const point = Number.parseInt(hex ?? decimal!, hex === undefined ? 10 : 16);
          if (!Number.isInteger(point) || point < 0 || point > 0x10ffff) {
            throw new Error(`invalid XML character reference: ${reference}`);
          }
          this.characters.validate(String.fromCodePoint(point));
        }
        return '';
      });
    if (remainder.includes('&')) { throw new Error('invalid XML entity or character reference'); }
  }

  tree(node: Node): void {
    if (node.nodeValue !== null) { this.characters.validate(node.nodeValue); }
    if (node.nodeType === 1) {
      for (const attribute of Array.from((node as Element).attributes)) {
        this.characters.validate(attribute.value);
      }
    }
    for (const child of Array.from(node.childNodes)) { this.tree(child); }
  }
}
