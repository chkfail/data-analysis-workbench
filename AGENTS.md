# AGENTS.md

本文件记录本项目的背景、功能约定、工程约束和部署注意事项。后续维护者或自动化 Agent 在动代码前应先阅读。

## 项目概览

- 项目名称：`data-judgement-tools`
- 技术栈：Next.js App Router + TypeScript + Tailwind CSS。
- 主要依赖：`next`、`react`、`xlsx`、`lucide-react`。
- 当前页面入口：[app/page.tsx](app/page.tsx)
- 全局样式入口：[app/globals.css](app/globals.css)
- Tailwind 配置：[tailwind.config.ts](tailwind.config.ts)

这是一个“数据研判工具集”网站，不是营销页。第一屏应直接是可操作工具台，避免大段说明、装饰性内容和无意义的 UI 占位。

## 已有功能

### 表格碰撞

支持左右两张 Excel / CSV 表导入，分别选择工作表和研判字段后进行碰撞。

模式命名必须使用业务名称：

- `补全模式`：等价于 left join，保留左表全部记录，未命中的记录状态显示为 `未命中`。
- `碰撞模式`：等价于 inner join，只保留命中的记录。

不要在界面上显示 `Left Join`、`Inner Join`、`待补全` 等旧文案。

导出按钮文案为 `导出 Excel`，导出 `.xlsx`，不要导出 CSV。

### 最新记录

支持单张 Excel / CSV 表导入，选择：

- `基准字段`：等价于 SQL 里的 `PARTITION BY`
- `时间字段`：等价于 `ORDER BY 时间字段 DESC`

结果应等价于：

```sql
ROW_NUMBER() OVER (PARTITION BY 基准字段 ORDER BY 时间字段 DESC) = 1
```

每个基准字段只保留时间最新的一条记录。空基准字段会被忽略，并在结果指标里展示忽略数量。

时间解析当前使用 `Date.parse`，并对 Excel 序列日期数字做基础兼容。

## UI/交互约定

- 顶部工具切换包括 `表格碰撞` 和 `最新记录`。
- 表格碰撞下才显示 `补全模式` / `碰撞模式`。
- 不要恢复“左表字段 ↔ 右表字段”这种顶部映射条，因为两张表卡片里已经分别选择了研判字段。
- 文件导入后，不再显示大面积导入框，只保留标题右侧的 `更换` 小按钮。
- 统计信息不要做成占据大面积的四个卡片，应收在结果标题旁边。
- 页面风格应偏工具型、清晰、低噪音。减少说明文字，优先让用户看到上传、字段选择、结果表格和导出。
- 使用 Tailwind CSS 写样式，不要回退到大量手写 CSS。

## 本地开发

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

重要注意：

- 当 `npm run dev` 正在运行时，尽量不要再跑 `next build`。之前出现过 dev server 和 build 共用 `.next` 目录导致 chunk 丢失，CSS/JS 500，页面变成裸 HTML 的问题。
- 若页面样式突然丢失，优先检查 `_next/static/css/app/layout.css` 是否返回 500。
- 样式丢失时通常不是 Tailwind 配置问题，而是 `.next` 缓存损坏。处理方式：停止 dev server，删除 `.next`，重新启动 `npm run dev`。
- 本机曾遇到 PowerShell 沙箱启动失败，必要时使用受控提权执行本地命令。

## 验证建议

改功能后优先运行：

```sh
npx tsc --noEmit
```

不要在 dev server 运行时随手执行 `npm run build`。如果确实需要构建验证，建议先停掉 dev server 或确认不会影响当前预览。

验证页面样式时，可检查：

- 首页返回 200
- CSS 文件返回 200
- CSS 内容包含 Tailwind 编译产物，而不是原始 `@tailwind`

## Docker 离线部署

本项目已做 Docker 化，目标是部署到没有互联网的 Linux Server。目标服务器 Docker Compose 环境很老，可能只有 `docker-compose` 命令，因此 compose 文件使用保守的 `version: "2"`。

相关文件：

- [Dockerfile](Dockerfile)
- [docker-compose.yml](docker-compose.yml)
- [deploy.sh](deploy.sh)
- [.dockerignore](.dockerignore)

Next 配置开启了 standalone 输出：

```js
output: "standalone"
```

### deploy.sh 子命令

```sh
sh deploy.sh pack
sh deploy.sh start
sh deploy.sh stop
```

含义：

- `pack`：构建 Docker 镜像，`docker save` 成镜像 tar，并把镜像、`docker-compose.yml`、`deploy.sh`、`VERSION` 打成 `tar.gz` 离线包。
- `start`：在离线服务器上加载本地镜像 tar，并通过 `docker-compose up -d` 启动。
- `stop`：通过 `docker-compose down` 停止。

端口默认是宿主机 `3000` 映射容器 `3000`。可通过环境变量覆盖：

```sh
TOOLS_WEB_PORT=8080 sh deploy.sh start
```

### 离线部署流程

在有 Docker 和网络的打包机执行：

```sh
sh deploy.sh pack
```

把 `dist/*.tar.gz` 上传到离线 Linux 服务器，然后：

```sh
tar -xzf tools-web-offline-*.tar.gz
sh deploy.sh start
```

服务器无需 npm、无需联网。

### 当前验证记录

已验证：

- Docker 镜像 `tools-web:offline` 可成功构建。
- 临时容器映射到 `3100:3000` 后，访问 `http://localhost:3100` 返回 200。
- 已生成过离线包：`dist/tools-web-offline-manual.tar.gz`。

注意：当前 Windows/WSL 环境没有启用 Docker Desktop 的 WSL integration，导致 `bash deploy.sh pack` 无法直接调用 Docker。Linux 打包机或目标 Linux 服务器不受此问题影响。

## Git/远端

本地仓库已初始化在 `main` 分支，首个提交为：

```text
5717bd0 first commit
```

远端配置为：

```text
https://tentu.dala-dubhe.ts.net:33000/andrie/tools-web.git
```

曾尝试推送，但远端返回认证失败：

```text
remote: Failed to authenticate user
fatal: Authentication failed
```

推送前需要先处理远端认证，例如 Git Credential Manager、token 或可用的远端地址。

## 忽略规则

应忽略以下类型文件：

- `node_modules`
- `.next`
- `dist`
- `.deploy-pack`
- `dev-server.log`
- `tsconfig.tsbuildinfo`
- 本地环境变量和包管理器 debug 日志

不要把离线部署包、构建缓存、依赖目录提交进仓库。
