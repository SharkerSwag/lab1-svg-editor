import { Numbers } from '../model/Numbers.js';

/** Flatten translations only; reject transforms whose appearance cannot be preserved. */
export class Translation {
  constructor(readonly dx = 0, readonly dy = 0) {
    Numbers.finite(dx, 'translation dx');
    Numbers.finite(dy, 'translation dy');
  }

  static parse(source: string): Translation {
    if (source.trim() === '') { return new Translation(); }
    const expression = /translate\s*\(([^()]*)\)/gu;
    const matches = [...source.matchAll(expression)];
    if (matches.length === 0 || source.replace(expression, '').replace(/[\s,]/gu, '') !== '') {
      throw new Error('unsupported transform: only translate is supported');
    }
    let dx = 0;
    let dy = 0;
    for (const match of matches) {
      const values = match[1]!.trim().split(/[\s,]+/u);
      if (values.length < 1 || values.length > 2) { throw new Error('invalid translate arguments'); }
      dx += Numbers.parse(values[0]!, 'translation dx');
      dy += values.length === 1 ? 0 : Numbers.parse(values[1]!, 'translation dy');
    }
    return new Translation(dx, dy);
  }

  combined(other: Translation): Translation { return new Translation(this.dx + other.dx, this.dy + other.dy); }
}
