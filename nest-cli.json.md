# 根目录 nest-cli.json 说明

当前根目录 Nest CLI 已切换到新的主应用 `admin-api`。旧的 `survey-statistics` 不再是根目录默认项目。

## 当前配置

```json
{
  "monorepo": true,
  "root": "apps/admin-api",
  "sourceRoot": "apps/admin-api/src",
  "projects": {
    "admin-api": {
      "type": "application",
      "root": "apps/admin-api",
      "entryFile": "main",
      "sourceRoot": "apps/admin-api/src",
      "compilerOptions": {
        "tsConfigPath": "apps/admin-api/tsconfig.build.json"
      }
    }
  }
}
```

## 配置项说明

### `monorepo`

保留 Nest CLI 的工作区模式，使根目录可以明确声明 `admin-api` 项目。

### `root`

```text
apps/admin-api
```

表示根目录执行 `nest build` 或 `nest start` 时使用的默认应用根目录。

### `sourceRoot`

```text
apps/admin-api/src
```

表示当前主应用的 TypeScript 源码目录。

### `projects.admin-api`

项目配置明确指定：

- 项目类型是 application。
- 入口文件是 `main.ts`。
- 源码目录是 `apps/admin-api/src`。
- 构建配置是 `apps/admin-api/tsconfig.build.json`。

## 常用命令

```bash
nest build
nest build admin-api
nest start
nest start admin-api
```

仓库推荐使用根目录代理命令，因为它会同时经过 `apps/admin-api` 自己的开发进程清理脚本：

```bash
pnpm build
pnpm start:dev
```

## 旧目录边界

`apps/survey-statistics` 和 `apps/nest-admin` 目录暂时保留，但不再登记为 pnpm workspace 或根 Nest CLI 的活动项目。`packages` 仅作为未来公共库边界保留。这样新架构不会继续继承旧项目的默认入口、TypeORM、MySQL、YAML 和旧构建脚本。
