# Lab1 SVG 编辑器

高级软件课程的个人 Lab。用 TypeScript 实现，通过命令行创建、编辑和保存 SVG，也可以同时打开浏览器看图。

仓库：[SharkerSwag/lab1-svg-editor](https://github.com/SharkerSwag/lab1-svg-editor) · 提交版本：[`final`](https://github.com/SharkerSwag/lab1-svg-editor/tree/final)

## 运行

需要 Node.js 24 或更新版本，在工程目录执行：

```powershell
npm ci
npm run cli
```

这是作业要求的 CLI，启动后输入 `init` 新建文档，输入 `help` 查看全部十九条命令。

如果想边输入边看图，运行 `npm start`。Windows 也可以双击 `start-editor.cmd`。程序会打开流程图示例的副本和浏览器预览，首次保存需要指定自己的文件名。

![运行界面](doc/live-preview.png)

在 `npm start` 启动的 `svg>` 终端里逐行输入：

```text
move node2 0 60
set process-label text "处理数据 v2"
undo
redo
save "我的图.svg"
```

右侧节点会整体下移，文字随节点移动。undo/redo 可以撤销、恢复文字修改，save 将图片写入文件。预览自动更新，但不会替你保存，也不会影响撤销历史。

## 其他启动方式

| 用途 | 命令 |
| --- | --- |
| 打开已有 SVG 并预览 | `npm run cli -- --file "我的图.svg" --preview` |
| 打开副本，另存新文件 | `npm run cli -- --copy "我的图.svg" --preview` |
| 回放命令文件 | `npm run cli -- --script "命令.txt"` |
| 查看启动参数 | `npm run cli -- --help` |

加上 `--no-open` 可以只打印预览地址，不自动启动浏览器。命令文件按行执行，错误后继续处理，有错误时返回非零退出码；相对路径以终端的工作目录为准。

## 使用时注意

- 图形通过大小写敏感的 id 定位；带空格的文字和路径用双引号包裹。
- read 后的无参数 save 写回读入路径。显式导出到其他文件不会改变这个默认路径；新文档第一次成功保存后才有默认路径。
- 成功 init/read/save 或修改画布尺寸会清空撤销历史，这是作业规定。tree/show/help、查询画布和预览不影响历史。
- 支持 VT 的终端可用 ↑/↓ 调出历史、Tab 补全命令名；简易终端逐行输入。
- 有未保存内容时，第一次 Ctrl+C 会提醒保存，再次按下才放弃退出。EOF 直接退出，不自动保存。

## 检查和示例

```powershell
npm run typecheck
npm test
npm run demo:svg
npm run demo:full
```

`npm test` 包含 95 项测试。`demo:svg` 在 output/ 下生成修改前后的流程图；`demo:full` 回放题目会话，其中祖孙冲突和保存后 undo 是两条预期错误。

已实现本阶段要求的十九条命令，以及 rect、circle、ellipse、line、text 和 g 六种图形。题目第 3 节和第 4.4 节明确将 box 与插件化列为后续阶段内容。外部 SVG 的导入约定写在实验报告里。

## 文档

- [实验报告：架构、过程记录、自查和质量保证](doc/README.md)
- [十九条命令的动手验收](doc/动手验收.md)
- [测试与运行记录](doc/verification.md)
- [提交检查清单](doc/验收清单.md)

提交日期：2026-10-24。课程平台要求上传一份含仓库地址的 README.md，可使用 doc/README.md；对应代码以远程 final 标签为准。
