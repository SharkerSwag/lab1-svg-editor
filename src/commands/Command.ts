/** CLI command contract; editable commands will additionally support undo. */
export interface Command {
  readonly name: string;
  readonly syntax: string;
  execute(parameters: readonly string[]): string;
}
