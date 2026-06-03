# AGENTS.md

本文件给后续维护者和自动化 Agent 使用。动代码前先读这里，优先保持项目现有结构和业务口径。

## 项目定位

- 项目名：`data-analysis-workbench`
- 技术栈：Next.js App Router、TypeScript、Tailwind CSS。
- 核心依赖：`next`、`react`、`xlsx`、`lucide-react`。
- 这是一个“数据研判工具台”，不是营销页。第一屏应直接呈现可操作工具，减少大段说明和装饰性 UI。
- 项目 icon 位于 `public/icon.svg`，同时作为 favicon 使用。
- 终端使用："C:\Program Files\Git\bin\bash.exe"

## 代码结构

- `app/page.tsx`：页面壳、全局状态编排、当前工具挂载、导出入口。
- `app/config/tools.ts`：工具注册信息，包括导航标题、页面标题、导出文件名和 sheet 名。
- `app/types.ts`：共享类型。
- `app/lib/workbook.ts`：Excel/CSV 解析、字段工具、Excel 导出。
- `app/lib/collision.ts`：多表碰撞业务计算。
- `app/lib/latest.ts`：取最新行业务计算。
- `app/components`：通用 UI 组件。
- `app/modules/collision`：多表碰撞模块 UI。
- `app/modules/latest`：取最新行模块 UI。

新增模块时：

1. 在 `app/config/tools.ts` 注册工具。
2. 在 `app/lib/<module>.ts` 放业务计算。
3. 在 `app/modules/<module>` 放模块 UI。
4. 在 `app/page.tsx` 只做状态接入和模块挂载，不堆大块 UI 或算法。

## 功能约定

### 多表碰撞

- 默认展示 2 张 Excel/CSV 表，可继续添加第 3、第 4 张表。
- 第 1 张表叫 `基准表`，后续参与表使用 `参与表 A`、`参与表 B`、`参与表 C`。
- 模式文案只使用业务名称：
  - `补全基准表`：等价于以基准表为主的 left join，保留基准表全部记录，未命中显示 `未命中`。
  - `只取交集`：等价于多表 inner join，只保留所有参与表都命中的记录。
- 界面不要出现 `Left Join`、`Inner Join`、`待补全` 等旧文案。
- 导出按钮文案为 `导出 Excel`，导出 `.xlsx`。
- 前端结果表格必须保留 `基准表.`、`参与表 A.` 等列名前缀，用于区分同名字段。
- Excel 导出时去掉表名前缀，但要允许重复表头。导出逻辑必须按二维数组列位置写入，不要用对象 key 方式生成 sheet，否则同名字段会互相覆盖。

### 取最新行

- 单表导入，选择 `基准字段` 和 `时间字段`。
- 结果等价于：

```sql
ROW_NUMBER() OVER (PARTITION BY 基准字段 ORDER BY 时间字段 DESC) = 1
```

- 每个基准字段只保留时间最新的一条记录。
- 空基准字段要忽略，并在结果指标里展示忽略数量。
- 时间解析当前使用 `Date.parse`，并兼容基础 Excel 序列日期数字。

## UI 约定

- 顶部导航是标准全宽 header，左侧显示 icon 和 `数据研判工具集`，工具切换放中间或偏左。
- 顶部工具切换包括 `多表碰撞` 和 `取最新行`。
- 只有多表碰撞模块显示 `补全基准表` / `只取交集`。
- 多表碰撞的表卡片横向单行排列，超出后左右滑动；`添加表` 按钮跟在同一横向列表最后。
- 不要恢复“左表字段 ↔ 右表字段”的顶部映射条。
- 文件导入后，不再显示大面积导入框，只保留标题右侧的 `更换` 小按钮。
- 统计信息应收在结果标题旁边，不要做成大面积指标卡。
- 页面风格偏工具型、清晰、低噪音。优先让用户看到上传、字段选择、结果表格和导出。
- 使用 Tailwind CSS 写样式，不要回退到大量手写 CSS。

## 本地开发与验证

常用命令：

```sh
npm install
npm run dev
npx tsc --noEmit
```

默认开发地址：

```text
http://localhost:3000
```

注意：

- 改功能后优先运行 `npx tsc --noEmit`。
- 当 `npm run dev` 正在运行时，尽量不要同时跑 `next build`，避免 `.next` 缓存互相影响。
- 若页面样式突然丢失，优先检查 `_next/static/css/app/layout.css` 是否返回 500；必要时停止 dev server，删除 `.next` 后重启。
- 本机 PowerShell 沙箱偶尔启动失败，必要时使用受控提权执行本地命令。

## Docker 离线部署

项目支持打包成离线 Docker 部署包，目标服务器无需 npm、无需联网。

相关文件：

- `Dockerfile`
- `docker-compose.yml`
- `deploy.sh`
- `.dockerignore`

常用命令：

```sh
sh deploy.sh pack
sh deploy.sh start
sh deploy.sh stop
```

约定：

- Compose 文件使用 `version: "2"`，兼容老版本 `docker-compose`。
- Next.js 使用 standalone 输出，Docker 镜像必须包含 `public/`，否则 `/icon.svg` 等静态资源会 404。
- 默认端口为宿主机 `3000` 到容器 `3000`，可通过 `DATA_ANALYSIS_WORKBENCH_PORT=8080 sh deploy.sh start` 覆盖。
- 离线包名形如 `dist/data-analysis-workbench-offline-*.tar.gz`。

## Git 远端

当前分支为 `main`。

远端：

```text
origin fetch: https://tentu.dala-dubhe.ts.net:33000/andrie/data-analysis-workbench.git
origin push:  https://tentu.dala-dubhe.ts.net:33000/andrie/data-analysis-workbench.git
origin push:  https://github.com/chkfail/data-analysis-workbench.git
github:       https://github.com/chkfail/data-analysis-workbench.git
```

执行 `git push origin main` 会同步推送到自建仓库和 GitHub。

## 忽略与提交

不要提交以下内容：

- `node_modules`
- `.next`
- `dist`
- `.deploy-pack`
- `dev-server.log`
- `tsconfig.tsbuildinfo`
- 本地环境变量和包管理器 debug 日志

提交前检查工作区，避免把离线部署包、构建缓存、依赖目录提交进仓库。
