# Lab1 SVG CLI 编辑器

个人 Lab1，TypeScript + 面向对象实现，使用 AI 协作并记录架构与开发过程。

仓库：https://github.com/SharkerSwag/lab1-svg-editor

**当前状态：第一个工程骨架里程碑，只实现输入解析、REPL 和 `help`，尚不能编辑 SVG。** 图形模型、编辑命令、撤销重做和 SVG 文件读写将在后续真实开发步骤中实现并分别提交。当前版本不是最终作业。

## 本地运行

需要 Node.js 24 或更新版本。

```powershell
npm ci
npm run cli
```

输入 `help` 查看命令规划。Windows 下按 Ctrl+Z 再回车发送 EOF 退出。只有交互终端显示 `svg> ` 提示符；脚本输入不显示提示符。

```powershell
npm run typecheck
npm test
```

项目 `.npmrc` 使用 npm 官方 registry，避免本机旧镜像地址影响安装；不修改用户全局 npm 配置。

## 作业文档与提交

- [架构方案、过程记录、自查与质量保证](doc/README.md)
- [功能验收清单与时间安排](doc/验收清单.md)

截至课程平台显示的 2026-10-31 23:59，需要推送最终代码和 `final` 标签，并把包含仓库地址的 `doc/README.md` 以文件名 `README.md` 上传课程平台。平台时区以课程设置为准。项目完成前不创建 `final` 标签。
