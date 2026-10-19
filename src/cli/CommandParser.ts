/** Tokenizes one line without treating color values as comments. */
export class CommandParser {
  parse(line: string): string[] {
    if (line.trimStart().startsWith('#')) {
      return [];
    }

    const tokens: string[] = [];
    let current = '';
    let quoted = false;
    let started = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index]!;
      const next = line[index + 1];

      if (quoted && character === '\\' && (next === '"' || next === '\\')) {
        current += next;
        index += 1;
        continue;
      }
      if (character === '"') {
        quoted = !quoted;
        started = true;
        continue;
      }
      if (!quoted && /\s/u.test(character)) {
        if (started) {
          tokens.push(current);
          current = '';
          started = false;
        }
        continue;
      }

      current += character;
      started = true;
    }

    if (quoted) {
      throw new Error('unterminated double quote');
    }
    if (started) {
      tokens.push(current);
    }
    return tokens;
  }
}
