import type { Shape } from '../model/Shape.js';
import type { SvgDocument } from '../model/SvgDocument.js';

export class TreeRenderer {
  render(document: SvgDocument, id?: string): string {
    const shape = id === undefined ? undefined : document.shape(id);
    const title = shape?.summary ?? `svg (${document.width}x${document.height})`;
    const children = shape === undefined ? document.children : shape.children;
    const lines = [title];
    this.appendChildren(children, '', lines);
    return lines.join('\n');
  }

  private appendChildren(children: readonly Shape[], prefix: string, lines: string[]): void {
    children.forEach((child, index) => {
      const last = index === children.length - 1;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${child.summary}`);
      this.appendChildren(child.children, `${prefix}${last ? '    ' : '│   '}`, lines);
    });
  }
}
