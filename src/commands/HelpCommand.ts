import type { Command } from './Command.js';

export class HelpCommand implements Command {
  readonly name = 'help';
  readonly syntax = 'help';

  execute(parameters: readonly string[]): string {
    if (parameters.length !== 0) {
      throw new Error('usage: help');
    }
    return [
      'SVG editor — bootstrap milestone',
      'Available now:',
      '  help',
      'Planned commands (not implemented yet):',
      '  init [w] [h]',
      '  read <file.svg>',
      '  save [file.svg]',
      '  canvas [w] [h]',
      '  create <type> <id> [params...] [in <containerId>]',
      '  delete <id>',
      '  move <id> <dx> <dy>',
      '  scale <id> <factor>',
      '  set <id> <attr> <value>',
      '  group <newGid> <id1> <id2>...',
      '  ungroup <gid>',
      '  addto <gid> <id>',
      '  front <id>',
      '  back <id>',
      '  tree [id]',
      '  show <id>',
      '  undo',
      '  redo',
      'Send EOF to exit (Ctrl+Z then Enter on Windows).',
    ].join('\n');
  }
}
