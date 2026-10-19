export interface ShapeInput {
  count(minimum: number, maximum: number, syntax: string): void;
  number(index: number, name: string): number;
  optional(index: number, name: string): string | undefined;
  content(index: number): string;
}
