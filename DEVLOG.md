
## 2026-05-19 — Phase: Visual .dbvsignore File Filtering

### 完成内容
- **FileTreeSelector 组件** (`src/components/common/FileTreeSelector.tsx`): 可视化文件树 + 勾选交互。默认全选，取消勾选即生成忽略规则。取消文件夹递归灰显所有子节点，重新勾选恢复。在导入项目弹窗和初始化向导中集成。
- **VirtualList Bug 修复** (`src/components/common/VirtualList.tsx`): react-window Row 组件外层 `<div style={style}>` 导致 top 偏移翻倍，仅第 0 行可点击。移除双包裹，直接返回 renderItem。
- **共享 buildTree 提取** (`src/utils/flattenTree.ts`): 将 TreeNode/FileEntry 接口和 buildTree 函数从 FileExplorer 搬出，供 FileTreeSelector 复用。
- **后端 .dbvsignore 读写** (`electron/dbvs-repository.ts`): 新增 `readDbvsIgnore()` 和 `writeDbvsIgnore()` 方法。导出 `DEFAULT_DBVSIGNORE_PATTERNS` 常量（dist/, build/, *.log, .env, .tmp/）。
- **新建项目自动生成 .dbvsignore** (`electron/ipc-handlers/dbgvs-project.ts` + `electron/cli-standalone.ts`):
  - 新建项目自动生成默认 `.dbvsignore` 模板
  - 导入项目支持 `options.ignorePatterns` 自定义规则
  - CLI 路径同步修复（此前 CLI 独立实现绕过了 IPC handler）
- **Settings 面板编辑器** (`src/components/Dashboard/Settings.tsx`):
  - DbvsIgnoreSection 组件：TextArea 编辑 + 加载/保存 + 快速添加按钮
  - 仅在打开项目时可用，无项目时显示提示
- **新增 IPC 通道**: `dbgvs:read-dbvsignore`、`dbgvs:write-dbvsignore`
- **新增 IPC 类型**: `readDbvsIgnore`、`writeDbvsIgnore`（`src/types/electron.d.ts` + `electron/preload.ts`）
- **Repository 分裂脑修复** (`electron/dbvs-repository.ts`): resolvePaths 先检查 .dbvs-link.json 再检测目录；initWorkingCopy 拒绝重新绑定到不同仓库；external-api 自动愈合过期注册表条目。
- **i18n 覆盖**: 中英双语完整覆盖（settings.dbvsIgnore*、importProject.toggleFileTree）

### 技术验证
- `npm run build` 通过（electron TSC + Vite 生产构建）
- CLI `create-project` / `import-project` 自动生成 `.dbvsignore` 模板
- `file-tree` 命令验证 `dist/` `build/` `*.log` `.env` `.tmp/` 过滤生效
- `status` / `commit` / `history` / `diff` / `rollback` / `undo-rollback` / `verify` 全部通过

### 涉及文件
23 个文件变更，新增 1 个组件文件（FileTreeSelector.tsx），+578 / -66 行。

---

## 2026-05-07 — Phase 1: AST Analysis Engine & Architecture Graph Builder

### 完成内容
- **AST 解析器** (`electron/ast-analyzer.ts`): 基于 TypeScript Compiler API (`ts.createSourceFile`)，零侵入解析项目源码，提取 imports/exports/functions/classes/call expressions。支持文件哈希缓存，避免重复解析未变更文件。
- **图谱构建器** (`electron/graph-builder.ts`): 将 AST 分析结果转为建筑比喻图谱（文件夹=楼栋、模块=楼层、文件=房间），自动识别 pipeline/hierarchy/flow 三类依赖边，DFS 循环检测标注 circular 红线。
- **图谱存储** (`electron/graph-store.ts`): 每版本独立存储图谱 JSON 到 `graphs/<commitId>.json`。包含图谱对比引擎（compareGraphs）和架构变更日志（_change-log.json）。
- **5 个新 IPC**: ast:parse-project, graph:build, graph:get, graph:list-versions, graph:compare
- **提交自动建图**: commit 成功后 setImmediate 后台异步构建图谱，失败不影响提交流程。

### 技术验证
- electron TypeScript 编译通过 (tsc --project tsconfig.node.json)
- 前端 TypeScript 类型检查通过 (tsc --noEmit)
- 已 push 到 GitHub (commit 8a81394)

### 新增依赖
- d3-force ^3.0.0
- d3-selection ^3.0.0
