# nest-cli.json 配置文件说明

本文档详细说明 Monorepo 模式下的 `nest-cli.json` 配置文件中每个配置项的作用和用法。

---

## 📋 文件概览

`nest-cli.json` 是 NestJS CLI 的核心配置文件，用于管理 Monorepo 工作区的构建、编译和项目组织。

---

## 🔧 全局配置

### `$schema`
```json
"$schema": "https://json.schemastore.org/nest-cli"
```

**说明：** JSON Schema 定义，提供 IDE 智能提示和配置验证

**作用：**
- 在编辑器中提供自动完成功能
- 验证配置文件的正确性
- 显示配置项的文档提示

**是否必需：** 可选，但强烈推荐

---

### `collection`
```json
"collection": "@nestjs/schematics"
```

**说明：** 指定用于生成代码的原理图集合

**作用：**
- 定义 `nest generate` 命令使用的模板集合
- NestJS 官方使用 `@nestjs/schematics`

**可选值：**
- `@nestjs/schematics` - NestJS 官方模板（默认）
- 自定义原理图集合

**是否修改：** 通常不需要修改

---

### `sourceRoot`
```json
"sourceRoot": "apps/survey-statistics/src"
```

**说明：** 默认项目的源代码根目录

**作用：**
- 指向默认项目的 `src` 目录
- 在 Monorepo 模式下指向默认应用的源代码位置

**何时修改：**
- 更换默认项目时需要修改
- 当前指向 `survey-statistics` 应用

**格式：** `apps/[项目名]/src`

---

### `monorepo`
```json
"monorepo": true
```

**说明：** 标识项目是否为 Monorepo 模式

**作用：**
- `true` - 启用 Monorepo 模式
- `false` 或不设置 - 标准模式（单个应用）

**重要性：** ⭐⭐⭐⭐⭐ 核心配置

**何时为 true：**
- 项目包含多个应用或库
- 需要共享代码和依赖

---

### `root`
```json
"root": "apps/survey-statistics"
```

**说明：** 默认项目的根目录

**作用：**
- 定义默认项目的根路径
- `nest start`、`nest build` 等命令默认操作此项目

**默认项目：**
- 当命令不指定项目名时，使用此项目
- 例如：`nest start` = `nest start survey-statistics`

**何时修改：** 更换默认项目时

---

## ⚙️ 编译选项 (compilerOptions)

### `webpack`
```json
"webpack": false
```

**说明：** 选择使用的编译器

**可选值：**
- `true` - 使用 webpack 编译器（打包为单个文件）
- `false` - 使用 tsc 编译器（保留文件结构）

**使用场景：**
- `webpack: true` - 适合大型项目，打包速度快
- `webpack: false` - 适合需要独立文件的场景，调试友好

**当前配置：** `false` - 使用 TypeScript 编译器

**注意：** 官方推荐使用 `builder` 替代此配置

---

### `tsConfigPath`
```json
"tsConfigPath": "apps/survey-statistics/tsconfig.app.json"
```

**说明：** 默认项目的 TypeScript 配置文件路径

**作用：**
- 指定编译默认项目时使用的 tsconfig 文件
- 当不指定项目名时使用此配置

**路径格式：** `apps/[项目名]/tsconfig.app.json`

**相关文件：** 每个应用都有自己的 `tsconfig.app.json`

---

### `deleteOutDir`
```json
"deleteOutDir": false
```

**说明：** 编译前是否删除输出目录

**可选值：**
- `true` - 每次编译前清空 `dist` 目录
- `false` - 保留现有文件，仅覆盖变更

**推荐配置：**
- 开发环境：`false` - 提高增量编译速度
- 生产环境：`true` - 确保构建产物干净

**当前配置：** `false` - 增量编译，提高开发效率

---

### `watchAssets`
```json
"watchAssets": true
```

**说明：** 是否监视非 TypeScript 资源文件

**作用：**
- 在 watch 模式下自动复制资源文件变更
- 配合 `assets` 配置使用

**使用场景：**
- 开发时需要自动复制 yml、json 等配置文件
- 静态资源文件需要实时同步

**当前配置：** `true` - 自动监视并复制资源文件

---

## 🎨 生成选项 (generateOptions)

### `spec`
```json
"spec": false
```

**说明：** 生成代码时是否自动创建测试文件

**可选值：**
- `true` - 自动生成 `.spec.ts` 测试文件
- `false` - 不生成测试文件
- 对象 - 针对特定原理图配置

**示例：**
```json
{
  "spec": {
    "service": false,    // service 不生成测试
    "controller": true   // controller 生成测试
  }
}
```

**当前配置：** `false` - 不自动生成测试文件

**命令行覆盖：**
```bash
nest g service user --no-spec  # 不生成测试
nest g service user --spec     # 生成测试
```

---

### `flat`
```json
"flat": false
```

**说明：** 生成代码时是否使用扁平结构

**可选值：**
- `true` - 文件直接生成在指定目录，不创建子文件夹
- `false` - 为每个模块创建独立文件夹（推荐）

**示例：**
```bash
# flat: false (默认)
nest g module user
# 生成: src/user/user.module.ts

# flat: true
nest g module user
# 生成: src/user.module.ts
```

**推荐配置：** `false` - 保持清晰的目录结构

---

## 📦 项目配置 (projects)

### 项目通用配置说明

每个项目（应用或库）包含以下配置：

---

### `type`
```json
"type": "application"  // 或 "library"
```

**说明：** 项目类型

**可选值：**
- `"application"` - 完整的可运行应用（包含 `main.ts`）
- `"library"` - 共享库（不可独立运行）

**应用 vs 库：**
- **应用** - 可以独立启动和部署
- **库** - 提供可复用的模块和功能

---

### `root`
```json
"root": "apps/survey-statistics"
```

**说明：** 项目根目录

**作用：**
- 定义项目的根路径
- 所有项目内的相对路径都基于此目录

**路径格式：**
- 应用：`apps/[应用名]`
- 库：`packages/[库名]`

---

### `entryFile`
```json
"entryFile": "main"
```

**说明：** 应用的入口文件名（不含扩展名）

**作用：**
- 指定应用的启动文件
- 实际文件：`src/main.ts`

**仅用于：** `application` 类型项目

**默认值：** `"main"`

---

### `sourceRoot`
```json
"sourceRoot": "apps/survey-statistics/src"
```

**说明：** 项目源代码目录

**作用：**
- 指向项目的 `src` 目录
- 编译器从此目录开始处理源文件

**路径格式：**
- 应用：`apps/[应用名]/src`
- 库：`packages/[库名]` （库通常不需要 src 子目录）

---

### `compilerOptions` (项目级)

#### `tsConfigPath`
```json
"tsConfigPath": "apps/survey-statistics/tsconfig.app.json"
```

**说明：** 项目的 TypeScript 配置文件

**作用：**
- 指定编译此项目时使用的 tsconfig
- 每个项目可以有独立的编译配置

**文件内容：**
- 继承根目录的 `tsconfig.json`
- 定义项目特定的编译选项
- 配置输出目录和路径映射

---

#### `assets` (项目级)
```json
"assets": [
  "config/*.yml",
  "config/*.yaml",
  "logs/.gitignore"
]
```

**说明：** 需要复制到构建产物的非 TypeScript 资源

**作用：**
- 自动复制配置文件、静态资源等
- 文件必须位于 `src` 目录内

**路径规则：**
- 相对于项目的 `sourceRoot`
- 支持 glob 模式匹配

**常见资源：**
- `*.yml` / `*.yaml` - 配置文件
- `*.json` - JSON 配置
- `*.graphql` - GraphQL schema
- `images/**` - 图片资源
- `.gitignore` - 特殊文件

**高级配置：**
```json
"assets": [
  "**/*.graphql",  // 简单格式：所有 graphql 文件
  {
    "include": "config/*.yml",    // 包含的文件
    "exclude": "**/test.yml",     // 排除的文件
    "outDir": "dist/config",      // 输出目录
    "watchAssets": true           // 是否监视
  }
]
```

---

## 📝 完整项目配置示例

### 应用项目 (Application)
```json
{
  "survey-statistics": {
    "type": "application",           // 应用类型
    "root": "apps/survey-statistics", // 项目根目录
    "entryFile": "main",             // 入口文件 (main.ts)
    "sourceRoot": "apps/survey-statistics/src", // 源代码目录
    "compilerOptions": {
      "tsConfigPath": "apps/survey-statistics/tsconfig.app.json", // TS配置
      "assets": [                    // 资源文件
        "config/*.yml",
        "config/*.yaml",
        "logs/.gitignore"
      ]
    }
  }
}
```

### 库项目 (Library)
```json
{
  "commons": {
    "type": "library",               // 库类型
    "root": "packages/commons",      // 项目根目录
    "entryFile": "index",            // 导出文件 (index.ts)
    "sourceRoot": "packages/commons", // 源代码目录
    "compilerOptions": {
      "tsConfigPath": "packages/commons/tsconfig.json" // TS配置
    }
  }
}
```

---

## 🔍 配置优先级

### 1. 命令行参数
```bash
nest build survey-statistics  # 最高优先级
```

### 2. 项目级配置
```json
"projects": {
  "survey-statistics": {
    "compilerOptions": { ... }  // 优先于全局配置
  }
}
```

### 3. 全局配置
```json
{
  "compilerOptions": { ... }  // 默认配置
}
```

---

## 💡 常见场景配置

### 场景 1: 添加新应用

```bash
# 使用 CLI 自动添加
nest generate app my-new-app

# CLI 会自动更新 nest-cli.json
```

### 场景 2: 添加新库

```bash
# 使用 CLI 自动添加
nest generate library my-lib

# CLI 会自动更新 nest-cli.json
```

### 场景 3: 修改默认项目

修改以下配置：
```json
{
  "sourceRoot": "apps/new-default-app/src",
  "root": "apps/new-default-app",
  "compilerOptions": {
    "tsConfigPath": "apps/new-default-app/tsconfig.app.json"
  }
}
```

### 场景 4: 添加资源文件自动复制

在项目的 `compilerOptions` 中添加：
```json
{
  "assets": [
    "**/*.yml",           // 所有 yml 文件
    "**/*.graphql",       // 所有 graphql 文件
    "templates/**"        // templates 目录下所有文件
  ]
}
```

---

## ⚠️ 常见问题

### Q1: 为什么资源文件没有被复制？

**A:** 检查以下几点：
1. 文件是否在 `src` 目录内
2. `assets` 配置是否正确
3. `watchAssets` 是否启用（开发模式）
4. 路径是否正确（相对于 sourceRoot）

### Q2: 如何让某个项目不生成测试文件？

**A:** 在项目配置中添加：
```json
{
  "projects": {
    "my-app": {
      "generateOptions": {
        "spec": false
      }
    }
  }
}
```

### Q3: 修改配置后需要重启吗？

**A:** 
- 修改 `compilerOptions` - 需要重新构建
- 修改 `assets` - 需要重启 watch 模式
- 修改 `generateOptions` - 立即生效（下次生成时）

### Q4: Monorepo 和标准模式如何切换？

**A:** 
- 标准 → Monorepo: 使用 `nest generate app`
- Monorepo → 标准: 不建议，需要手动迁移

---

## 📚 相关文档

- [NestJS CLI 官方文档](https://docs.nestjs.com/cli/overview)
- [Monorepo 工作区](https://docs.nestjs.com/cli/monorepo)
- [TypeScript 配置](https://www.typescriptlang.org/tsconfig)

---

## 🎯 最佳实践

1. ✅ **不要手动修改** - 尽量使用 `nest generate` 命令
2. ✅ **资源放在 src 内** - 确保 assets 能被正确处理
3. ✅ **使用项目级配置** - 为不同项目定制不同选项
4. ✅ **启用 watchAssets** - 开发时自动同步资源文件
5. ✅ **合理使用 flat** - 大型项目建议 `flat: false`
6. ✅ **版本控制** - 提交到 Git，团队共享配置

---

**最后更新:** 2026-02-05
