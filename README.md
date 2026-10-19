# Lab1 SVG CLI 编辑器

个人 Lab1，TypeScript + 面向对象实现，使用 AI 协作并记录架构与开发过程。

仓库：https://github.com/SharkerSwag/lab1-svg-editor

**当前状态：已实现画布、六种图形的创建与查看，以及创建命令的撤销重做。** 可用命令为 `help/init/canvas/create/tree/show/undo/redo`。移动、缩放、属性修改、结构编辑和 SVG 文件读写尚未实现；当前版本不是最终作业。

## 本地运行

需要 Node.js 24 或更新版本。

```powershell
npm ci
npm run cli
```

输入 `help` 查看已实现和计划中的命令。Windows 下按 Ctrl+Z 再回车发送 EOF 退出。只有交互终端显示 `svg> ` 提示符；脚本输入不显示提示符。

可以在 CLI 内逐行输入（不要复制 `svg>` 提示符）：

```text
init 800 600
create g node1
create rect start 120 100 160 60 #4a90d9 in node1
create text label 155 135 "开始" in node1
tree
show start
undo
tree
redo
tree
```

`undo` 撤销刚创建的文字，`redo` 将其恢复。创建失败不占用 id、不改变文档和历史。`init` 和 `canvas w h` 成功后清空历史并禁止撤销重做，直到下一次成功编辑；只查询 `canvas` 不影响历史。

在工程目录的普通终端中（不是 `svg>` 内）运行完整的两节点流程图创建演示：

```powershell
npm run demo
```

演示脚本位于 [examples/creation.txt](examples/creation.txt)，包含中文标签、嵌套分组和撤销重做。当前可查看结构树，还不能保存为 SVG 文件。

```powershell
npm run typecheck
npm test
```

项目 `.npmrc` 使用 npm 官方 registry，避免本机旧镜像地址影响安装；不修改用户全局 npm 配置。

## 作业文档与提交

- [架构方案、过程记录、自查与质量保证](doc/README.md)
- [功能验收清单与时间安排](doc/验收清单.md)

截至课程平台显示的 2026-10-31 23:59，需要推送最终代码和 `final` 标签，并把包含仓库地址的 `doc/README.md` 以文件名 `README.md` 上传课程平台。平台时区以课程设置为准。项目完成前不创建 `final` 标签。
