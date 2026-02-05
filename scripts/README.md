# NestJS Monorepo Assets 复制工具

## 概述

这个工具用于自动复制 NestJS Monorepo 中的非 TypeScript 资源文件（assets），解决 `nest-cli.json` 的 `assets` 配置在使用 `tsc` 编译器时无法自动复制文件的问题。

## 背景

NestJS CLI 的 `assets` 功能存在以下限制：

1. **仅支持 webpack 编译器**：`assets` 配置仅在使用 `webpack: true` 时生效
2. **tsc 编译器不支持**：使用 `tsc` 编译器（`webpack: false`）时，`assets` 配置会被忽略
3. **库项目限制**：在库（library）项目中，`assets` 配置会被静默忽略

参考：[NestJS CLI Issue #1845](https://github.com/nestjs/nest-cli/issues/1845)

## 工具说明

### 1. Node.js 版本（推荐）

**文件**: `scripts/copy-assets.js`

**特点**:
- ✅ 智能解析 `nest-cli.json` 配置
- ✅ 支持 glob 模式匹配
- ✅ 支持所有项目或指定单个项目
- ✅ 彩色输出，显示详细复制进度
- ✅ 跨平台兼容（Windows/macOS/Linux）

**使用方法**:

```bash
# 复制所有应用的 assets
pnpm copy-assets

# 仅复制 survey-statistics 项目
pnpm copy-assets:survey

# 仅复制 nest-admin 项目
pnpm copy-assets:admin

# 直接运行脚本，复制指定项目
node scripts/copy-assets.js survey-statistics
```

**工作原理**:

1. 读取根目录的 `nest-cli.json` 文件
2. 遍历 `projects` 配置，找到所有应用类型（`type: "application"`）的项目
3. 对每个项目，读取其 `compilerOptions.assets` 配置
4. 使用 `glob` 库匹配 `include` 模式
5. 将匹配的文件复制到 `outDir` 指定的目标目录

### 2. Shell 版本（简化版）

**文件**: `scripts/copy-assets.sh`

**特点**:
- ✅ 轻量级，无需 Node.js 依赖
- ✅ 快速执行
- ⚠️ 硬编码路径，仅支持 `survey-statistics` 项目
- ⚠️ 不解析 `nest-cli.json`，需要手动维护

**使用方法**:

```bash
# 复制 survey-statistics 的 assets
pnpm copy-assets:sh

# 或直接运行
bash scripts/copy-assets.sh
```

## 配置示例

`nest-cli.json` 中的 assets 配置：

```json
{
  "projects": {
    "survey-statistics": {
      "type": "application",
      "root": "apps/survey-statistics",
      "sourceRoot": "apps/survey-statistics/src",
      "compilerOptions": {
        "tsConfigPath": "apps/survey-statistics/tsconfig.app.json",
        "assets": [
          {
            "include": "apps/survey-statistics/src/config/*.yml",
            "outDir": "dist/apps/survey-statistics/src/config",
            "watchAssets": true
          },
          {
            "include": "apps/survey-statistics/src/logs/*",
            "outDir": "dist/apps/survey-statistics/src/logs",
            "watchAssets": true
          }
        ]
      }
    }
  }
}
```

## 集成到构建流程

已在 `package.json` 中集成：

```json
{
  "scripts": {
    "survey:build": "nest build survey-statistics && pnpm copy-assets:survey",
    "admin:build": "nest build nest-admin && pnpm copy-assets:admin",
    "build:all": "... && pnpm copy-assets"
  }
}
```

**构建流程**:

1. `nest build` - TypeScript 编译
2. `pnpm copy-assets` - 自动复制 assets 文件

## 支持的 Assets 格式

### 对象格式（推荐）

```json
{
  "include": "apps/survey-statistics/src/config/*.yml",
  "outDir": "dist/apps/survey-statistics/src/config",
  "watchAssets": true
}
```

### 字符串格式

```json
"config/*.yml"
```

## 常见问题

### Q: 为什么需要这个工具？

A: NestJS CLI 的 `assets` 配置在使用 `tsc` 编译器时不起作用。这个工具提供了一个可靠的替代方案。

### Q: 开发环境也需要复制 assets 吗？

A: 不需要。开发环境使用 `nest start --watch`，直接从源码目录读取配置文件。只有生产构建时才需要复制。

### Q: 如何添加新的 assets？

A: 在 `nest-cli.json` 的对应项目配置中添加 `assets` 项，工具会自动识别并复制。

### Q: Node.js 版本和 Shell 版本选哪个？

A: 推荐使用 Node.js 版本（`copy-assets.js`），它更智能、更灵活、跨平台兼容。Shell 版本仅作为备选方案。

## 扩展功能

如需添加新项目的 assets 复制，只需：

1. 在 `nest-cli.json` 中配置项目的 `assets`
2. Node.js 脚本会自动识别并处理
3. （可选）在 `package.json` 中添加便捷脚本：

```json
{
  "scripts": {
    "copy-assets:myapp": "node scripts/copy-assets.js myapp"
  }
}
```

## 技术细节

- **glob 模式**: 使用 `glob` 库进行文件匹配
- **路径解析**: 使用 `path` 模块处理跨平台路径
- **目录创建**: 自动创建不存在的目标目录（`recursive: true`）
- **错误处理**: 友好的错误提示和退出码

## 维护指南

- **Node.js 版本**: 保持 `scripts/copy-assets.js` 与 `nest-cli.json` 配置同步，无需手动修改脚本
- **Shell 版本**: 如果更改了 assets 路径，需要手动更新 `scripts/copy-assets.sh`
