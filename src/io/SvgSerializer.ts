import type { Shape } from '../model/Shape.js';
import type { SvgDocument } from '../model/SvgDocument.js';
import { XmlEscaper } from './XmlEscaper.js';

export class SvgSerializer {
  private readonly escape = new XmlEscaper();

  serialize(document: SvgDocument): string {
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${document.width}" height="${document.height}" viewBox="0 0 ${document.width} ${document.height}">`,
    ];
    for (const shape of document.children) { this.append(shape, '  ', lines); }
    lines.push('</svg>');
    return lines.join('\n') + '\n';
  }

  private append(shape: Shape, indent: string, lines: string[]): void {
    const attributes = [
      `id="${this.escape.attribute(shape.id)}"`,
      ...Array.from(shape.geometry, ([name, value]) => `${name}="${value}"`),
      ...Array.from(shape.styles, ([name, value]) => `${name}="${this.escape.attribute(value)}"`),
      ...Array.from(shape.presentation, ([name, value]) => `${name}="${this.escape.attribute(value)}"`),
    ].join(' ');
    const children = shape.children;
    if (shape.text !== undefined) {
      lines.push(`${indent}<${shape.tag} ${attributes}>${this.escape.text(shape.text)}</${shape.tag}>`);
    } else if (children.length === 0) {
      lines.push(`${indent}<${shape.tag} ${attributes}/>`);
    } else {
      lines.push(`${indent}<${shape.tag} ${attributes}>`);
      for (const child of children) { this.append(child, indent + '  ', lines); }
      lines.push(`${indent}</${shape.tag}>`);
    }
  }
}
