export class Numbers {
  static finite(value: number, name: string): number {
    if (!Number.isFinite(value)) {
      throw new Error(`${name} must be a finite number`);
    }
    return value;
  }

  static nonNegative(value: number, name: string): number {
    this.finite(value, name);
    if (value < 0) {
      throw new Error(`${name} must be non-negative`);
    }
    return value;
  }

  static positive(value: number, name: string): number {
    this.finite(value, name);
    if (value <= 0) {
      throw new Error(`${name} must be positive`);
    }
    return value;
  }

  static parse(value: string, name: string): number {
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/u.test(value)) {
      throw new Error(`${name} must be a finite number`);
    }
    return this.finite(Number(value), name);
  }
}
