# Lab1 SVG CLI 编辑器

个人 Lab1，TypeScript + 面向对象实现，使用 AI 协作并记录架构与开发过程。

仓库：https://github.com/SharkerSwag/lab1-svg-editor

**当前状态：Phase 1 的全部 CLI 命令已实现，正在做最终完整验收。** 支持画布、六种图形、全部图形编辑、撤销重做与 SVG 读写。`box` 和动态插件不属于本阶段。

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

演示脚本位于 [examples/creation.txt](examples/creation.txt)，包含中文标签、嵌套分组和撤销重做。

导出真正的图片文件：

```powershell
npm run demo:svg
```

随后把工程目录的 `output/flowchart.svg` 拖进浏览器查看。此文件由本程序的 `save` 生成。也可以在 `svg>` 中执行 `save "我的图.svg"`；第一次指定路径后，后续 `save` 可省略路径。成功保存会设置历史屏障，失败则不改变历史和关联路径。`output/` 是生成目录，不提交 Git。

```powershell
npm run typecheck
npm test
```

项目 `.npmrc` 使用 npm 官方 registry，避免本机旧镜像地址影响安装；不修改用户全局 npm 配置。

外部 SVG 导入范围与边界见 [作业文档](doc/README.md)。本程序支持题目要求的六种基本元素，不是通用 SVG 浏览器；遇到未支持的格式会明确报错。

## 作业文档与提交

- [架构方案、过程记录、自查与质量保证](doc/README.md)
- [功能验收清单与时间安排](doc/验收清单.md)

截至课程平台显示的 2026-10-31 23:59，需要推送最终代码和 `final` 标签，并把包含仓库地址的 `doc/README.md` 以文件名 `README.md` 上传课程平台。平台时区以课程设置为准。项目完成前不创建 `final` 标签。
