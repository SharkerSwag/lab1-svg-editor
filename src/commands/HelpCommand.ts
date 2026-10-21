import type { Command } from './Command.js';

export class HelpCommand implements Command {
  readonly name = 'help';
  readonly syntax = 'help';

  execute(parameters: readonly string[]): string {
    if (parameters.length !== 0) {
      throw new Error('usage: help');
    }
    return [
      'SVG editor — Lab1 Phase 1',
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
      '  group <newGid> <id1> <id2>...',
      '  ungroup <gid>',
      '  addto <gid> <id>',
      '  front <id>',
      '  back <id>',
      '  read <file.svg>',
      'Preview: save drawing.svg, then open drawing.svg in a browser.',
      '实时看图：普通终端运行 npm start，或 npm run cli -- --preview。',
      '快捷键：↑/↓ 历史、Tab 补全命令；退出前请 save。',
      'Send EOF to exit (Ctrl+Z then Enter on Windows).',
    ].join('\n');
  }
}
