import type { Command } from './Command.js';

export class HelpCommand implements Command {
  readonly name = 'help';
  readonly syntax = 'help';

  execute(parameters: readonly string[]): string {
    if (parameters.length !== 0) {
      throw new Error('usage: help');
    }
    return [
      'SVG editor — creation and document milestone',
      'Available now:',
      '  help',
      '  init [w] [h]',
      '  canvas [w] [h]',
      '  save [file.svg]',
      '  create <type> <id> [params...] [in <containerId>]',
      '    rect <id> <x> <y> <w> <h> [fill]',
      '    circle <id> <cx> <cy> <r> [fill]',
      '    ellipse <id> <cx> <cy> <rx> <ry> [fill]',
      '    line <id> <x1> <y1> <x2> <y2> [stroke]',
      '    text <id> <x> <y> "content"',
      '    g <id>',
      '  tree [id]',
      '  show <id>',
      '  undo',
      '  redo',
      '  delete <id>',
      '  move <id> <dx> <dy>',
      '  scale <id> <factor>',
      '  set <id> <attr> <value>',
      'Planned commands (not implemented yet):',
      '  read <file.svg>',
      '  group <newGid> <id1> <id2>...',
      '  ungroup <gid>',
      '  addto <gid> <id>',
      '  front <id>',
      '  back <id>',
      'Send EOF to exit (Ctrl+Z then Enter on Windows).',
    ].join('\n');
  }
}
