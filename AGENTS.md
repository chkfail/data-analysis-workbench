# AGENTS.md

本文件给后续维护者和自动化 Agent 使用。动代码前先读这里，优先保持项目现有结构、业务口径和工具型 UI 风格。

## 项目定位

- 项目名：`data-analysis-workbench`
- 产品名：`数据研判工具箱`
- 技术栈：Next.js App Router（静态导出）、TypeScript、Tailwind CSS、Electron 桌面端。
- 核心依赖：`next`、`react`、`exceljs`、`lucide-react`；桌面端 `electron@22.3.27`；测试 `vitest`。
- 唯一交付形态是 Windows 桌面应用（Electron），已不再提供 Docker / Web 服务部署。
- 这是一个面向 Excel/CSV 的本地数据研判工具台，不是营销页。第一屏应直接呈现可操作工具。
- 项目 icon 位于 `public/icon.svg`，同时作为 favicon 使用。
- 推荐终端：`C:\Program Files\Git\bin\bash.exe`。当前 Codex Windows PowerShell 沙箱偶尔会启动失败，必要时使用受控提权执行本地命令。

## 当前工具

顶部导航由 `app/config/tools.ts` 的 `TOOL_DEFINITIONS` 自动渲染。当前包括：

- `多表碰撞`：多张表按字段碰撞，支持补全基准表或只取交集。
- `多表合并`：以基准表字段为准，合并多张参与表的所有 sheet。
- `智能提取`：从源列按模板或自定义正则提取结构化字段。
- `模糊去重`：按相似度算法发现重复行，支持完全一致字段约束。
- `差异对比`：对比两张表，识别新增、删除、修改和一致。
- `跨表检索`：跨多个 Excel/CSV 和多工作表全字段检索，按命中 sheet 展示原表切片。
- `取最新行`：按基准字段和时间字段保留最新一条。

## 代码结构

- `app/page.tsx`：页面壳、全局导航、各模块 hook 接入和模块挂载。不要在这里放模块状态、大块 UI 或算法。
- `app/config/tools.ts`：工具注册信息，包括导航标题、页面标题、导出文件名和默认 sheet 名。
- `app/types.ts`：共享类型。
- `app/lib/workbook.ts`：Excel/CSV 解析（编码识别、表头行识别）、字段工具、时间解析、Excel 导出（类型还原）。
- `app/lib/collision.ts` / `merge.ts` / `extract.ts` / `dedup.ts` / `diff.ts` / `search.ts` / `latest.ts`：各工具业务计算，必须是纯函数，便于放进 Worker 和写单测。
- `app/lib/compute.ts`：Worker 计算任务注册表。新增需要放进 Worker 的计算时在这里登记。
- `app/lib/*.test.ts`：业务计算单测（Vitest）。
- `app/workers/compute.worker.ts`：计算 Worker 入口。
- `app/hooks/useComputation.ts`：在 Worker 中执行计算，带防抖、取消和过期结果丢弃。
- `app/hooks/useWorkbookSlot.ts`：单表槽位（导入、切换工作表、修改表头行）和统一的文件解析错误处理。
- `app/components`：通用 UI 组件。
- `app/modules/<module>`：各工具模块 UI 和模块私有 hook，每个模块一个 `use<Module>Workbench.ts`，负责状态、计算接入和导出。
- `electron/main.cjs`：Electron 主进程；`electron/build-icon.cjs`：图标生成。

新增模块时：

1. 在 `app/config/tools.ts` 注册工具。
2. 在 `app/types.ts` 增加必要共享类型。
3. 在 `app/lib/<module>.ts` 放业务计算，并补 `app/lib/<module>.test.ts`。
4. 在 `app/lib/compute.ts` 登记计算任务。
5. 在 `app/modules/<module>` 放模块 UI 和 `use<Module>Workbench.ts`，通过 `useComputation` 调用计算。
6. 在 `app/page.tsx` 只做 hook 接入和模块挂载。

## 通用数据约定

- 支持 `.xlsx`、`.csv`。`.xls` 不支持（`xlsx` 依赖已因安全问题移除），导入时提示用户另存为 `.xlsx`。
- CSV 先按 UTF-8 严格解码，失败再按 GB18030（GBK 超集）解码；带 BOM 时按 BOM 解码。分隔符自动识别逗号、制表符、分号、竖线。
- 解析时先保留原始二维数组（`WorkbookState.raw`），再按表头行生成数据行（`WorkbookState.sheets`）。
- 表头行默认自动识别：只跳过开头不同值不超过 2 个的标题行、制表信息行；用户可在表卡片上手动改 `表头第 N 行`。多工作表都参与的表（检索表、合并参与表）修改表头行时应用到全部工作表。
- 数据行保留表头的全部列和列顺序，空单元格为空字符串；全空行跳过。
- xlsx 日期单元格读成 `2024-01-02` 或 `2024-01-02 10:05:00`（按 UTC 分量格式化，不受机器时区影响）。
- 导出时还原类型：普通数字写成数字；11 位及以上整数（手机号、身份证、银行卡）和超过 15 位有效数字的值保留文本；`2024-01-02(…)` 写成 Excel 日期。导出都走 `writeWorksheet`，不要绕过它直接 `addRow`。
- 所有结果计算放在 Worker 里，参数变化自动重算；计算中显示 `计算中` 和 `取消`，导出按钮禁用。传给 Worker 的输入只带需要的数据，不要传 `raw`。

## 业务约定

### 多表碰撞

- 默认展示 2 张 Excel/CSV 表，可继续添加第 3、第 4 张表。
- 第 1 张表叫 `基准表`，后续参与表使用 `参与表 A`、`参与表 B`、`参与表 C`。
- 模式文案只使用业务名称：
  - `补全基准表`：等价于以基准表为主的 left join，保留基准表全部记录，未命中显示 `未命中`。
  - `只取交集`：等价于多表 inner join，只保留所有参与表都命中的记录。
- 界面不要出现 `Left Join`、`Inner Join`、`待补全` 等旧文案。
- 默认不区分大小写；顶部可勾选 `区分大小写`。
- 前端结果表格必须保留 `基准表.`、`参与表 A.` 等列名前缀，用于区分同名字段。
- Excel 导出时去掉表名前缀，但要允许重复表头。导出逻辑必须按二维数组列位置写入，不要用对象 key 方式生成 sheet，否则同名字段会互相覆盖。
- 结果行需要按整行去重，类似 SQL 的 `DISTINCT *`，但界面不要展示 `DISTINCT *` 英文说明。
- 碰撞字段重复会产生笛卡尔积。单次最多生成 `MAX_COLLISION_ROWS`（200,000）行，超出时截断，并在结果标题旁提示预计行数。

### 多表合并

- 1 张 `基准表` + 多张 `参与表`；参与表支持单个导入，也支持 `批量添加表`（Ctrl/Cmd 多选文件）。
- 字段映射先按字段名自动匹配（`normalizeKey`），未匹配字段可手动映射到基准字段。
- 合并范围是参与表的所有 sheet，全部合并到结果中。
- 输出列 = 基准表字段 + `来源表名`。
- `整行去重` 开关默认开启，需显示去重移除数量。

### 智能提取

- 单表导入，支持多选源列；每个源列独立匹配，不要把多列直接拼接，避免跨列误匹配。
- 模板按钮支持多选。
- 当前模板包括：手机号、身份证号、银行卡号、邮箱、财付通、支付宝、自定义正则。
- `金额` 模板已移除，不要恢复。
- 若同一行同一模板命中多个值，输出字段按 `手机号1`、`手机号2` 这类序号扩展。
- 财付通邮箱不要被邮箱模板重复命中；支付宝账号不要被银行卡模板重复命中。
- 身份证号应校验日期和校验位；明显出生日期不合法的数字串不能当身份证。
- 银行卡号应排除合法身份证、支付宝号，并做基础长度与 Luhn 校验。
- 结果说明使用 `提取身份证号 X 行`、`提取邮箱 X 行` 这种分模板口径。

### 模糊去重

- 单表导入，选择 `匹配字段`，可额外选择 `完全一致字段`。
- `完全一致字段` 表示该字段内容必须完全相同，才允许被归到同一重复组。
- 默认不区分大小写；顶部可勾选 `区分大小写`。
- 相似度算法包括 `编辑距离` 和 `二元组`。
- 分块粒度包括 `首字分块`、`首2字分块` 和 `不分块`。`不分块` 能发现首字不同的重复（如 `张三丰`/`章三丰`），但耗时随行数平方增长。
- `工作表`、`匹配字段`、`完全一致字段` 在数据表卡片内并排展示；工作表列宽应明显小于字段列。
- 推荐导出应只导出去重后的推荐保留行和独立行；全量导出保留重复组标记。

### 差异对比

- 固定两张表：`旧表` 和 `新表`。
- 模式包括：
  - `按内容比对`：无可靠主键时使用，优先匹配完全一致行，再把高度相似的剩余行配成修改。
  - `按字段对齐`：用户选择 1 个或多个字段作为对齐字段。
- 默认不区分大小写；顶部可勾选 `区分大小写`。
- 按内容比对的相似配对用倒排索引 + 前缀过滤召回候选，结果与逐行全量比较一致（有单测对拍），不要退回 O(n×m) 全量扫描。
- 按字段对齐时，重复 key 不要丢弃后续行，应按出现顺序配对，并在 note 里提示 `对齐字段存在重复，已按出现顺序配对`。
- 修改行的 `变更字段` 列使用 `字段名: 旧值 → 新值`，多个字段用 `；` 分隔。
- 修改行展示新表数据；删除行展示旧表数据；新增行展示新表数据。

### 跨表检索

- 输入为多张 Excel/CSV 表。每张表可以多选工作表，导入后默认选中全部工作表。
- 搜索要素放在上传表区域下方，符合先选数据源、再输入线索的动线。
- 支持 `精确`、`包含`、`模糊` 三种检索方式。
- 默认不区分大小写；顶部可勾选 `区分大小写`。
- 检索范围是选中工作表的全字段搜索，不需要用户选择字段。
- 结果不要展示 `来源表 / 字段 / 命中值` 明细表。结果应按命中的 sheet 分块展示，每块保持该 sheet 的原始列结构，只展示命中行。
- 结果中只高亮命中的要素本身，不要整行高亮。
- 导出为 `.xlsx`，每个命中 sheet 一个 Excel sheet，sheet 名就是命中工作表名；sheet 内只保留命中行，表头保持原样。
- 如果多个来源有同名 sheet，导出时自动给后续 sheet 加后缀，避免 Excel sheet 名冲突。
- 搜索模块状态较多，优先放在 `app/modules/search/useSearchWorkbench.ts`，不要继续把 `page.tsx` 撑大。

### 取最新行

- 单表导入，选择 `基准字段` 和 `时间字段`。
- 结果等价于：

```sql
ROW_NUMBER() OVER (PARTITION BY 基准字段 ORDER BY 时间字段 DESC) = 1
```

- 每个基准字段只保留时间最新的一条记录。
- 空基准字段要忽略，并在结果指标里展示忽略数量。
- 时间解析见 `toTimestamp`：支持 Excel 序列日期、`2024-01-02` / `2024/1/2` / `2024.1.2`（可带时分秒）、`2024年1月2日 10时5分`、`20240102(103000)`，其余交给 `Date.parse`。
- 时间非空但无法解析的行按最旧处理，并在结果指标里展示 `时间无法解析(按最旧)` 数量。
- 未导入数据时不要让右侧出现大片空白；配置卡片和上传卡片应保持视觉平衡。

## UI 约定

- 顶部导航是标准全宽 header，左侧显示 icon 和 `数据研判工具箱`，工具切换放中间或偏左。
- 工具切换由 `TOOL_DEFINITIONS` 自动渲染；新增工具时注意导航在窄屏是否会拥挤。
- 文件导入后，不再显示大面积导入框，只保留标题右侧的 `更换` 小按钮。
- 多表类工具的表卡片横向单行排列，超出后左右滑动；`添加表` 按钮跟在同一横向列表最后。
- `添加表` 按钮宽度应明显小于普通表卡片；高度要与同一行表卡片统一，不要被内容撑成巨型卡片。
- 统计信息应收在结果标题旁边，不要做成大面积指标卡。
- 页面风格偏工具型、清晰、低噪音。优先让用户看到上传、字段选择、结果表格和导出。
- 使用 Tailwind CSS 写样式，不要回退到大量手写 CSS。
- 不要在工具型界面放大段说明文字。必要说明用短标签、note 或导出按钮文案承载。
- 不要使用营销页式 hero、装饰性大图、渐变插画或大面积空白。

## 本地开发与验证

常用命令：

```sh
npm install
npm run dev            # 浏览器调试 http://localhost:3000
npm run electron:dev   # 用 Electron 窗口直连 dev server（需先跑 npm run dev）
npm run typecheck      # tsc --noEmit
npm test               # vitest 单测
```

注意：

- 改功能后至少运行 `npm run typecheck` 和 `npm test`；改业务计算要同步补单测。
- 用户明确说不需要启动时，不要启动 dev server。
- 当 `npm run dev` 正在运行时，尽量不要同时跑 `next build`，避免 `.next` 缓存互相影响。
- 若页面样式突然丢失，优先检查 `_next/static/css/app/layout.css` 是否返回 500；必要时停止 dev server，删除 `.next` 后重启。
- 本机 PowerShell 沙箱偶尔启动失败，必要时使用受控提权执行本地命令。

## Electron 桌面端打包

项目以 Windows 桌面应用交付，目标是 Win7–Win11 全覆盖。

技术决策：

- 使用 `electron@22.3.27`（固定版本，不可升级）：这是最后一个支持 Windows 7/8/8.1 的 Electron 大版本（Chromium 108）。Electron 23+ 和 Tauri 2.12+ 均已放弃 Win7。业务代码不要使用 Chromium 108 不支持的 API。
- 该版本已停止安全更新，可接受的前提是：应用完全离线、不加载任何远程内容。主进程已做以下约束，不要放开：
  - `nodeIntegration: false`、`contextIsolation: true`、`sandbox: true`；
  - `webRequest` 拦截除 `app:` / `blob:` / `data:`（及开发模式 dev server）外的全部请求；
  - 禁止 `will-navigate` 跳出本地包，`setWindowOpenHandler` 一律拒绝。
- `next.config.mjs` 固定 `output: "export"`，`npm run build` 静态导出到 `out/`。
- 渲染端通过自定义标准协议 `app://bundle/` 加载 `out/`（`protocol.registerFileProtocol`，Electron 22 还没有 `protocol.handle`）。不要改回 `file://`：`file://` 下 Web Worker 和绝对路径的 `/_next` 资源都会失效。
- Electron 主进程在 `electron/main.cjs`（CommonJS，Electron 22 不支持 ESM 主进程）。
- 打包配置在 `electron-builder.yml`，产物输出到 `dist/electron/`（已被 gitignore）。

常用命令：

```sh
npm run build            # 静态导出到 out/
npm run electron:start   # 导出后用 Electron 打开
npm run dist:electron    # 打出 NSIS 安装包 + 便携版到 dist/electron/
```

注意：

- 默认只打 x64；如需覆盖 32 位 Win7 老机器，在 `electron-builder.yml` 的 `arch` 里加 `ia32`。
- 应用图标由 `npm run icon:gen` 从 `public/icon.svg` 生成到 `build/icon.ico`（用 Electron 离屏渲染，无需额外装图像工具）；`icon.svg` 变更后重新执行该命令即可。
- 不要升级 electron 依赖，除非确认放弃 Win7 支持。
- 打包脚本固定带 `CSC_IDENTITY_AUTO_DISCOVERY=false`（不做代码签名）。若机器未开开发者模式，electron-builder 解包 winCodeSign 缓存时会因无符号链接权限报错；解决方法是把 `%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\<数字>` 下已解出的目录复制为同级的 `winCodeSign-2.6.0`。
- 调试桌面端时若进程秒退且无报错，检查环境变量 `ELECTRON_RUN_AS_NODE` 是否被置为 1（某些终端环境会带上它），置空后重试。
- 现场排障可设 `DAW_DEBUG_LOG=1`，主进程会在系统临时目录写 `daw-electron.log`（含被拦截的请求和找不到的资源）。

## 忽略与提交

不要提交以下内容：

- `node_modules`
- `.next`
- `out`
- `dist`
- `dev-server.log`
- `tsconfig.tsbuildinfo`
- 本地环境变量和包管理器 debug 日志

提交前检查工作区，避免把安装包、构建缓存、依赖目录提交进仓库。
