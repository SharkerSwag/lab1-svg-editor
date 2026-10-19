# Phase 1 验证记录

验证日期：2026-10-19。

## 环境与命令

- Windows，Node.js v24.19.0、npm 11.17.0、Git 2.45.1。
- TypeScript 7.0.2、tsx 4.23.15、@xmldom/xmldom 0.9.12；依赖版本与完整依赖树由 package-lock.json 固定。
- `npm test`：先构建，再运行 Node 内置测试运行器，目前 **81/81 通过**；旧 final 的 67 项测试属于上一轮证据，不能替代本轮复核。
- 干净目录验证通过：从提交 `90a86f8` 使用 git archive 解出源码到独立临时目录，无现成 node_modules/dist/output；依次执行 `npm ci`、`npm run typecheck`、`npm test`、`npm run demo:svg`、`npm run demo:full`，全部成功。
- 干净目录中同样为 67/67 通过，完整会话只产生两条预期错误。之后仅更新交付与验证文档，运行代码和测试未改动。

上述 67 项干净目录结果只适用于旧轮次。二次独立复核另发现并修复保存路径、UNC 与非法 XML 引用问题；新增 7 项回归用例。

第二轮从修复提交 `023ba74` 使用 git archive 解出另一独立临时目录，重新执行 npm ci、类型检查、npm test、demo:svg 与 demo:full，**74/74 通过**，完整会话仍只有两条题目预期错误。新导出的 output/flowchart.svg 与已由浏览器检查的 doc/browser-preview.svg SHA-256 一致，预览证据仍适用。

第三轮新增编码声明校验、两个回归测试、四个混合操作测试和一个中文指南验收测试。编码声明测试在修复前均失败、修复后通过。当前类型检查、81 项测试和差异空白检查通过；旧 final 不移动。

## 证据与覆盖范围

| 测试文件 | 覆盖内容 |
| --- | --- |
| CommandParser.test.ts、Cli.test.ts | 引号、空文本、颜色、注释、路径、错误后继续读取、提示符和 EOF |
| Model.test.ts | 六种图形、唯一 id、父子关系、数值校验、树所有权与复制隔离 |
| EditorCommands.test.ts、History.test.ts | 创建历史、显示不改历史、成功 IO 屏障、失败后 redo、重做分支清理 |
| Editing.test.ts | 多态变换、全部几何缩放、set 白名单、删除子树、后续子节点溢出时整条失败 |
| Structure.test.ts | 分组顺序、跨父分组、祖孙冲突、提升孩子位置、根级禁止解组、addto 防环、同级 z-order |
| Save.test.ts、Read.test.ts | 转义、UTF-8、自动 id 避碰撞、六种元素往返、失败 IO 不改文档/路径/历史、关联路径 |
| Acceptance.test.ts | 题目第 6 节完整会话和第 6.1 节案例 A，通过真实 CLI 进程回放并读取生成文件验证 |
| Acceptance.test.ts（中文指南） | 实际进程回放动手验收文档的十九条命令，核对三个预期错误、七个元素、缩放结果、解组、子树恢复与画布保存 |
| StateMachine.test.ts | 四个固定种子各 300 步；独立状态栈验证撤销/重做，失败不改变文档/路径，查询不影响历史，IO 屏障，逐步核对树与索引及序列化往返 |
| Architecture.test.ts | 包级 import 方向、一类一文件、类型 switch 所在位置，以及十九条命令注册与帮助完整性 |

架构检查使用当前源码格式的静态扫描，不是完整 TypeScript AST 或动态依赖分析；同时人工核对了实际 import、组合入口与两处名字分派。它不会证明不存在所有形式的架构违规。

## 浏览器检查

程序执行 `npm run demo:svg` 后，浏览器直接加载生成的 `output/flowchart.svg`。截图保存在 doc/browser-preview.png，用于核对两个矩形、中文标签、位移后的节点和连线端点。这是浏览器实际渲染的结果。

第三轮同时回放 doc/动手验收.md，Edge 无头浏览器直接加载实际生成的 output/动手验收.svg，900×500 截图保存在 doc/hands-on-preview.png，导出源文件保存为 doc/hands-on-preview.svg。实际检查确认五种叶子图形可见、中文完整、分组缩放的位置/大小与命令一致，两个 g 没有额外绘制边框。

PlantUML 组件图由 doc/architecture.puml 经 PlantUML 1.2026.9（MIT 版，本地 Java）生成 PNG/SVG，已检查中文标签与依赖箭头可读。

## 限制

- 只保证 doc/README.md 明确列出的 SVG 子集，不支持完整 SVG 标准或 CSS 渲染。
- 对 Lab 小型图形采用整文档快照，未做大规模性能、并发文件修改或跨平台 GUI 验证。
- 自动测试通过是当前质量证据，不代表没有未知缺陷。
