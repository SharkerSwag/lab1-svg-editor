export class CommandArguments {
  static count(parameters: readonly string[], minimum: number, maximum: number, syntax: string): void {
    if (parameters.length < minimum || parameters.length > maximum) {
      throw new Error(`usage: ${syntax}`);
    }
  }
}
