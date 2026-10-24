# Lab1：SVG 编辑器（CLI）

仓库地址：[https://github.com/SharkerSwag/lab1-svg-editor](https://github.com/SharkerSwag/lab1-svg-editor)

提交版本：[`final`](https://github.com/SharkerSwag/lab1-svg-editor/tree/final)　整理日期：2026-10-24

本实验与 Codex 协作完成，用 TypeScript 编写了一个 SVG 命令行编辑器。支持题目要求的十九条命令和 rect、circle、ellipse、line、text、g 六种图形。另加了只读浏览器预览，方便查看命令执行后的图片；图形编辑仍在 CLI 中完成。box 和动态插件属于后续阶段，本次未实现。

## 运行方法

安装 Node.js 24 或更新版本，在工程目录执行：

```powershell
npm ci
npm run cli
```

启动后输入 `init` 新建画布，`help` 查看语法。需要实时看图时运行 `npm start`，Windows 也可以双击 start-editor.cmd。该方式打开示例的工作副本，使用 `save "我的图.svg"` 保存自己的文件。

以下是程序实际运行的界面：

![实时预览](https://raw.githubusercontent.com/SharkerSwag/lab1-svg-editor/final/doc/live-preview.png)

## 架构方案

### 模块划分

| 目录 | 职责 |
| --- | --- |
| src/cli | 按行读取命令，处理引号、提示符、启动参数和键盘操作 |
| src/application | 注册和调度命令，维护当前文档、保存路径及会话状态 |
| src/commands | 实现十九条命令、可撤销编辑对象和历史栈 |
| src/model | 图形类、容器、画布、id 索引和结构编辑规则 |
| src/io | 读写 SVG、解析 XML、读取命令文件，以及只读预览 |
| src/main.ts | 创建对象并注入依赖，作为程序入口 |
| tests | 功能、边界、命令回放和架构检查 |

组件图由 PlantUML 生成，源码也在仓库中：

![架构组件图](https://raw.githubusercontent.com/SharkerSwag/lab1-svg-editor/final/doc/architecture.png)

[PlantUML 源码](https://github.com/SharkerSwag/lab1-svg-editor/blob/final/doc/architecture.puml) · [SVG 图](https://github.com/SharkerSwag/lab1-svg-editor/blob/final/doc/architecture.svg)

### 设计模式

**Command** 用于命令执行和撤销重做。命令入口与每次编辑的数据分开：例如 CreateCommand 解析参数，每执行一次就新建一个 CreateShapeEdit，避免后一次输入覆盖前一次的撤销信息。History 只在编辑成功后压栈，新编辑成功后清空 redo。group、delete 等多节点操作也只占一个撤销单元。

创建命令保存图形副本及父 id，其他编辑采用 SnapshotEdit 保存修改前后的文档快照，也就是 Memento 的做法。编辑先在候选文档上完成，全部成功后才替换当前内容。这样即使容器后面的子节点计算溢出，前面的节点也不会留下部分修改。代价是历史占用较多内存，本实验的小图规模可以接受。

**Composite** 用于统一叶子与容器。Rect、Circle 等具体图形和 Group 都继承 Shape，命令调用相同的 moved、scaled、withAttribute 接口。Group 在内部递归处理孩子，因此 move/scale 不需要知道目标是矩形还是分组。图形的几何和样式由类封装，修改方法返回新对象。

**集中式工厂** 负责根据类型创建图形。CLI 的位置参数和 SVG 的命名属性分别适配成 ShapeInput，两条输入路径共用 ShapeFactory，没有在读取器里再写一套 switch(tag)。

按作业要求，按名字分派只保留在 CommandRegistry 和 ShapeFactory 两处，并列为待重构点。后续增加插件时，再将类型工厂改为提供者注册机制。

### 依赖方向

- cli → application：输入层提交命令，不直接编辑图形或写文件。
- application → commands/model：会话协调命令、历史和存储接口，不导入 io 的具体实现。
- commands → model：命令操作领域对象，不依赖终端或文件系统。
- io → model：负责格式转换与读写，不控制编辑历史。
- model 不依赖上述其他模块；main 负责组合各模块。

CommandContext 放在 commands，由 EditorSession 实现，避免命令反向依赖 application。DocumentStorage 和 DocumentView 放在 model，分别作为存储和展示接口；main 注入具体实现。预览拿到的是独立文档副本，不能直接改写会话。CLI 通过入口注入的回调通知预览更新，不需要导入 HTTP 服务。

### 变化点假设

| 可能的变化 | 当前处理 |
| --- | --- |
| 新增命令 | 添加命令类，在 CommandRegistry 注册，历史逻辑继续复用 |
| 新增图形或 box 插件 | 保留 Shape 接口与集中工厂，本阶段不做动态加载 |
| 新增文件格式 | 通过 DocumentStorage 接口接入，不把格式判断写进命令 |
| 增加其他交互界面 | 复用应用层与模型；本次预览已通过只读接口接入 |
| 图形变大，快照占用过多内存 | 再考虑增量撤销；本次先保证树结构和撤销结果正确 |

### 几个实现约定

题目没有完全规定跨父容器分组的落点。本实现按原文档前序保持图形相对顺序，将新组插入最低公共父容器的最早相关分支前；原来的空容器保留。重组不改几何坐标，普通 g 的样式按 SVG 规则继承，因此换父容器可能改变继承外观。

read 绑定默认保存路径，显式 save 到另一文件只导出副本，不改这个路径。init 或打开工作副本后，第一次成功 save 建立默认路径。成功 init/read/save/画布修改会设置历史屏障；失败命令保持原文档、路径和历史。

导入支持 UTF-8 XML、六种基本元素、嵌套容器、公共样式、数字/px 长度、文字与 CDATA。缺失 id 先避开所有显式 id，再按标签加序号补全并警告。title/desc/metadata 不作为图形；保留字号、字体、对齐等显示属性。根尺寸可取匹配的 viewBox 或默认值；viewBox 限于 0 0 width height。支持展平 translate，其他变换、CSS style/class、未支持的元素或属性、DTD 和非 UTF-8 输入会报错。未知 data-kind 会警告并降为普通类型。

## 过程记录

开发使用 Codex 协作，代码按功能逐步提交。下面保留几次对结果影响较大的讨论和修改。

### 10 月 19 日：先弄清命令行如何变成图片

最开始只有终端文字，不容易理解 SVG 编辑器在做什么。讨论后先实现 save，用浏览器打开程序导出的 SVG，再继续实现移动、缩放和分组。这样可以直接看到图形模型与图片之间的关系。后来增加的实时预览也沿用同一个序列化器。

实现 Command 时，将可重复使用的命令入口和每次编辑的数据拆开。否则一个 CreateCommand 被多次压入历史后，后面的参数可能覆盖前面的撤销数据。创建、结构编辑和失败后 redo 的测试都围绕这个问题补齐。

模型还做了所有权隔离：文档接收图形时复制，对外查询也返回副本。这样外部拿到 Group 后再加孩子，不会绕过文档的全局 id 索引。

### 10 月 19 日：复核发现的问题

第一次功能测试通过后曾过早打过 final。继续对照原文检查，发现 `read A → save B → save` 会错误地把默认路径改成 B；作业要求应写回读入的 A。修复后增加了回归测试。

这次还发现，引号解析会压缩 Windows UNC 路径的反斜杠，XML 库会接受部分非法数字字符引用。前者改为只转义双引号，后者补了输入和解析后的字符检查。编码声明复核时，又补上了对非 UTF-8 声明的拒绝。这些问题都先用测试复现，再修复。

架构检查最初想用 TypeScript 编译器 API，但安装版本的入口没有提供预期接口。最后采用有限的源码静态扫描，并人工检查关键依赖，没有把它当成完整 AST 分析。

### 10 月 21 日：把预览和保存分开

实时预览需要直接显示内存里的文档，不能通过每次自动 save 来刷新，否则会清掉撤销历史。最终用 DocumentView、SvgSerializer 和 SSE 同步画面，命令执行与历史仍走原有逻辑。

保存状态比较实际文档内容。执行编辑后再 undo 回已保存的图，提示也会恢复为已保存。Ctrl+C 第一次提醒保存，第二次才放弃退出；EOF 仍直接结束，没有加入自动恢复文件。

浏览器下载副本曾做过尝试，但实际 Edge 测试没有完成下载，因此删除了这个功能。预览页只负责复制保存命令，文件写入继续走 CLI 的原子保存逻辑。终端测试还发现 TERM=dumb 会使 Node 关闭补全和历史编辑，于是按终端能力显示提示，并在支持 VT 的终端重新检查快捷键。

### 10 月 24 日：提交整理

提交前重新核对课程截图和附件，整理了 README，保留仓库地址、架构图、实现取舍及实际修正记录。最终代码以 final 标签定位，课程平台上传本文件即可。

## 一致性自查

**目录与方案是否一致？** cli、application、commands、model、io 均与方案一致。后加的 ShapeInput 适配器、SnapshotEdit、StructureEditor 及预览接口也放在相应职责的目录中。快照策略和预览的接入方式已记录在上文。

**依赖方向是否符合方案？** 架构测试扫描生产代码的 import，检查包级依赖、一类一文件，以及类型 switch 的位置；另抽查了 EditorSession、CommandContext、DocumentStorage、DocumentView 和 main 的组合关系，未发现违反上述规则的依赖。静态扫描不是完整的语义分析，所以仍保留人工检查。

## 质量保证手段

在工程目录执行：

```powershell
npm run typecheck
npm test
npm run demo:full
```

共有 95 项自动测试，覆盖参数解析、六种图形、id 与父子索引、十九条命令、undo/redo、失败后状态不变、文件读写、预览及启动参数。其中四组固定种子共执行 1,200 步混合命令，每一步检查树与索引，并做 SVG 往返比较。

题目第 6 节会话、案例 A 和中文动手指南都通过实际 CLI 进程回放，再读取保存文件核对结果。完整会话中的祖孙冲突、保存后 undo 是预期错误。

代码已在独立干净检出目录重新安装、构建和测试。Windows 启动文件实际执行过启动、编辑、保存和退出；Edge 检查过图片、中文、缩放、状态变化、复制命令、重连和窄窗口显示。

实现只针对本阶段的 SVG 子集，未做大型图形性能、并发文件修改和其他桌面平台的 GUI 验证。相关记录和示例在仓库中：

- [测试与运行记录](https://github.com/SharkerSwag/lab1-svg-editor/blob/final/doc/verification.md)
- [动手验收](https://github.com/SharkerSwag/lab1-svg-editor/blob/final/doc/%E5%8A%A8%E6%89%8B%E9%AA%8C%E6%94%B6.md)
- [提交检查清单](https://github.com/SharkerSwag/lab1-svg-editor/blob/final/doc/%E9%AA%8C%E6%94%B6%E6%B8%85%E5%8D%95.md)
