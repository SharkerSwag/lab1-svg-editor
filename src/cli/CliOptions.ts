import { parseArgs } from 'node:util';

export class CliOptions {
  readonly preview: boolean;
  readonly openBrowser: boolean;
  readonly file: string | undefined;
  readonly copy: string | undefined;
  readonly script: string | undefined;
  readonly help: boolean;

  constructor(args: readonly string[]) {
    const { values } = parseArgs({
      args: [...args], allowPositionals: false,
      options: {
        preview: { type: 'boolean' }, 'no-open': { type: 'boolean' },
        file: { type: 'string' }, copy: { type: 'string' }, script: { type: 'string' },
        help: { type: 'boolean', short: 'h' },
      },
    });
    if (values.file !== undefined && values.copy !== undefined) { throw new Error('--file and --copy cannot be used together'); }
    for (const path of [values.file, values.copy, values.script]) {
      if (path !== undefined && path.trim() === '') { throw new Error('file paths must not be empty'); }
    }
    this.preview = values.preview ?? false;
    this.openBrowser = this.preview && !(values['no-open'] ?? false);
    this.file = values.file;
    this.copy = values.copy;
    this.script = values.script;
    this.help = values.help ?? false;
  }

  get usage(): string {
    return [
      'SVG editor — 启动方式',
      '  npm start                         示例副本 + 实时浏览器预览',
      '  npm run cli                       作业标准 CLI',
      '  npm run cli -- --preview           空会话 + 实时预览',
      '  npm run cli -- --file "图.svg"      打开已有文件，save 写回原路径',
      '  npm run cli -- --copy "图.svg"      打开副本，首次 save 需指定新路径',
      '  npm run cli -- --script "命令.txt"  批量回放，出现错误时返回非零退出码',
      '  --no-open                         只打印预览地址，不自动启动浏览器',
      '  -h, --help                        显示本帮助',
      '预览随终端命令自动更新，不执行 save，也不改变 undo/redo。',
      '交互终端支持 ↑/↓ 历史、Tab 命令补全；退出前用 save 保存。',
    ].join('\n');
  }
}
