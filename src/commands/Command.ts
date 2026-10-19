/** Parsed CLI entry point. Each successful edit creates a separate UndoableEdit. */
export interface Command {
  readonly name: string;
  readonly syntax: string;
  execute(parameters: readonly string[]): string;
}
