import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import { EditorApplication } from '../application/EditorApplication.js';
import { CommandParser } from './CommandParser.js';

export class Cli {
  constructor(
    private readonly parser: CommandParser,
    private readonly application: EditorApplication,
    private readonly changed: () => void = () => {},
    private readonly unsaved: () => boolean = () => false,
  ) {}

  async run(input: Readable, output: Writable, interactive: boolean): Promise<number> {
    const terminal = interactive && 'isTTY' in input && Boolean(input.isTTY) && 'isTTY' in output && Boolean(output.isTTY);
    const lines = createInterface({
      input, output: terminal ? output : undefined, crlfDelay: Infinity, terminal,
      historySize: 200, removeHistoryDuplicates: true,
      completer: (line: string) => [this.application.complete(line), line],
    });
    let errors = 0;
    let exitArmed = false;
    lines.setPrompt('svg> ');
    if (terminal) {
      lines.on('SIGINT', () => {
        if (this.unsaved() && !exitArmed) {
          exitArmed = true;
          output.write('\nwarning: 有尚未保存的更改。输入 save "文件.svg" 保存；再次 Ctrl+C 放弃并退出。\n');
          lines.prompt();
        } else { lines.close(); }
      });
    }
    output.write("svg-editor 0.1 — type 'help' for commands\n");
    if (terminal) {
      output.write(process.env.TERM === 'dumb'
        ? '简易终端模式：逐行输入；退出前请 save。Ctrl+C 退出。\n'
        : '实时预览不会替你保存。↑/↓ 历史 · Tab 命令补全 · Ctrl+C 退出\n');
    }
    if (interactive) {
      if (terminal) { lines.prompt(); } else { output.write('svg> '); }
    }

    try {
      for await (const line of lines) {
        exitArmed = false;
        try {
          const result = this.application.execute(this.parser.parse(line));
          if (result !== undefined) {
            output.write(`${result}\n`);
          }
        } catch (error: unknown) {
          errors += 1;
          const message = error instanceof Error ? error.message : 'unexpected failure';
          output.write(`error: ${message.replace(/[\r\n]+/gu, ' ')}\n`);
        }
        this.changed();
        if (interactive) {
          if (terminal) { lines.prompt(); } else { output.write('svg> '); }
        }
      }
    } finally {
      lines.close();
    }
    if (interactive && this.unsaved()) { output.write('\nwarning: 当前更改未保存到文件。\n'); }
    return errors;
  }
}
