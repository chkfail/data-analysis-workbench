# 数据研判工具箱

面向 Excel/CSV 的本地数据研判工作台。项目提供多表碰撞、跨表检索、智能提取、模糊去重、差异对比和取最新行等常用数据处理工具，适合在浏览器中快速完成线索核查、表格比对和结果导出。

## 功能

| 工具 | 用途 | 导出 |
| --- | --- | --- |
| 多表碰撞 | 多张表按字段碰撞，支持补全基准表或只取交集 | 单 sheet 结果 |
| 智能提取 | 从文本列按模板或自定义正则提取手机号、身份证号、邮箱、银行卡、财付通、支付宝等结构化字段 | 单 sheet 结果 |
| 模糊去重 | 按编辑距离或二元组相似度发现重复行，支持完全一致字段约束 | 推荐结果 / 全量标记 |
| 差异对比 | 对比旧表和新表，识别新增、删除、修改和一致 | 单 sheet 结果 |
| 跨表检索 | 多表、多工作表全字段搜索，支持精确、包含、模糊匹配 | 每个命中工作表一个 sheet |
| 取最新行 | 按基准字段分组，并按时间字段保留最新一条 | 单 sheet 结果 |

## 特性

- 支持 `.xlsx`、`.csv`。
- 所有计算在浏览器本地完成，不依赖后端服务，数据不会上传到服务器。
- 统一导出 `.xlsx`，适合继续用 Excel 研判。
- 多表工具支持横向表卡片布局和追加表。
- 多个模块支持 `区分大小写` 开关。
- 使用二维数组导出，避免同名字段在 Excel 导出时被对象 key 覆盖。
- 支持 Docker 离线部署包，目标服务器无需 npm、无需联网。

## 快速开始

```sh
npm install
npm run dev
```

打开：

```text
http://localhost:3000
```

生产构建：

```sh
npm run build
```

类型检查：

```sh
npx tsc --noEmit
```

## 离线 Docker 部署

打包离线部署包：

```sh
sh deploy.sh pack
```

在目标服务器启动：

```sh
sh deploy.sh start
```

停止：

```sh
sh deploy.sh stop
```

默认端口为宿主机 `3000` 到容器 `3000`。可以通过环境变量覆盖：

```sh
DATA_ANALYSIS_WORKBENCH_PORT=8080 sh deploy.sh start
```

## 目录结构

```text
app/
  page.tsx                 页面壳、导航、模块挂载
  config/tools.ts          工具注册
  types.ts                 共享类型
  lib/                     各工具业务计算和 workbook 工具
  components/              通用 UI 组件
  modules/                 各工具模块 UI
public/
  icon.svg                 应用图标和 favicon
Dockerfile
docker-compose.yml
deploy.sh
```

## 开发约定

- 新增工具时，在 `app/config/tools.ts` 注册，在 `app/lib/<module>.ts` 放业务计算，在 `app/modules/<module>` 放模块 UI。
- `app/page.tsx` 只做状态接入和模块挂载，不放复杂算法和大块 UI。
- UI 保持工具型、低噪音、信息密度适中。
- 改功能后优先运行 `npx tsc --noEmit`。
- 更多维护约定见 [AGENTS.md](AGENTS.md)。

## 技术栈

- Next.js App Router
- TypeScript
- Tailwind CSS
- exceljs
- lucide-react

## License

This project is licensed under the GNU Affero General Public License v3.0. See [LICENSE](LICENSE) for details.
