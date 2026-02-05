# TypeScript 配置策略说明

本文档说明 Monorepo 项目中 TypeScript 配置文件的层级结构和设计原则。

---

## 📋 配置文件层级

```
项目根目录/
├── tsconfig.json                          # 基础配置（共享编译选项）
├── tsconfig.build.json                    # 构建配置
├── apps/
│   └── survey-statistics/
│       ├── tsconfig.json                  # IDE 配置（开发时使用）
│       ├── tsconfig.app.json              # 构建配置（nest build 使用）
│       └── tsconfig.build.json            # 测试配置（可选）
└── packages/
    └── commons/
        └── tsconfig.json                  # 库配置
```

---

## 🎯 配置文件职责

### 1. 根目录 `tsconfig.json`

**职责：** 提供基础的 TypeScript 编译选项，供所有子项目继承

**不包含：**
- ❌ `baseUrl` - 因为各子项目位置不同
- ❌ `paths` - 因为路径映射依赖于 baseUrl
- ❌ `include/exclude` - 由子项目自行定义

**包含：**
- ✅ 通用编译选项（module、target、decorators 等）
- ✅ 代码风格配置（strict、skipLibCheck 等）

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2017",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    // ... 其他通用配置
    // ❌ 不包含 baseUrl 和 paths
  }
}
```

---

### 2. 子应用 `tsconfig.json`

**职责：** IDE 和开发工具使用的配置

**用途：**
- ✅ VS Code、WebStorm 等 IDE 的类型检查
- ✅ 开发时的智能提示
- ✅ ESLint、Prettier 等工具

**必须包含：**
- ✅ `extends` - 继承根配置
- ✅ `baseUrl` - 指向根目录（`"../../"`）
- ✅ `paths` - 路径别名映射
- ✅ `include/exclude` - 指定哪些文件参与编译

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": "../../",  // 指向项目根目录
    "paths": {
      "@/*": ["apps/survey-statistics/src/*"],
      "@base/commons": ["packages/commons"],
      "@base/utils": ["packages/utils"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

---

### 3. 子应用 `tsconfig.app.json`

**职责：** NestJS CLI 构建时使用的配置

**用途：**
- ✅ `nest build` 命令
- ✅ 生产环境构建

**特点：**
- 继承根配置
- 定义构建输出目录
- 指定需要编译的文件

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "declaration": false,
    "outDir": "../../dist",
    "baseUrl": "../../",
    "paths": {
      // 与 tsconfig.json 相同的 paths 配置
    }
  },
  "include": ["src/**/*.ts", "config/**/*.ts"],
  "exclude": ["node_modules", "dist", "test", "**/*spec.ts"]
}
```

---

## ❓ 为什么需要重复定义 paths？

### 问题：baseUrl 是相对路径

```
根目录 tsconfig.json
  └── baseUrl: "./"  (相对于根目录)

子应用 tsconfig.json
  └── extends 根配置
  └── baseUrl: "../../"  (必须覆盖，指向根目录)
      └── 覆盖 baseUrl 后，paths 的解析基础也变了
          └── 必须重新定义 paths
```

**核心原因：**
- `baseUrl` 相对于 **tsconfig.json 文件所在位置**
- 子应用继承根配置的 `baseUrl: "./"` 会解析为 `apps/survey-statistics/`（错误）
- 必须覆盖为 `baseUrl: "../../"` 才能正确指向根目录
- 一旦覆盖 baseUrl，必须重新定义 paths

---

## ✅ 当前采用的策略

### 策略：根配置不定义 paths

**优点：**
- ✅ 避免混淆 - 根配置只包含通用选项
- ✅ 清晰明确 - 每个子项目独立定义自己的路径映射
- ✅ 灵活性高 - 不同子项目可以有不同的路径配置

**配置结构：**

```json
// 根目录 tsconfig.json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "es2017",
    // ... 只包含通用配置
    // ❌ 不定义 baseUrl 和 paths
  }
}

// 子应用 tsconfig.json (survey-statistics)
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": "../../",
    "paths": {
      "@/*": ["apps/survey-statistics/src/*"],
      "@base/commons": ["packages/commons"],
      "@base/utils": ["packages/utils"]
    }
  }
}

// 子应用 tsconfig.json (nest-admin)
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": "../../",
    "paths": {
      "@/*": ["apps/nest-admin/src/*"],
      "@base/commons": ["packages/commons"],
      "@base/utils": ["packages/utils"]
    }
  }
}
```

---

## 🔧 其他可选策略

### 策略 2：使用 TypeScript Project References

适合更复杂的 Monorepo，但配置较复杂。

```json
{
  "references": [
    { "path": "./packages/commons" },
    { "path": "./packages/utils" },
    { "path": "./apps/survey-statistics" }
  ]
}
```

### 策略 3：使用相对路径导入

不使用路径别名，直接用相对路径：

```typescript
// 不推荐：路径复杂
import { QueryBuilder } from '../../packages/commons';

// 推荐：使用别名
import { QueryBuilder } from '@base/commons';
```

---

## 📝 配置检查清单

### 添加新应用时

- [ ] 创建 `apps/new-app/tsconfig.json`
- [ ] 设置 `extends: "../../tsconfig.json"`
- [ ] 设置 `baseUrl: "../../"`
- [ ] 定义 `paths` 映射
- [ ] 创建 `apps/new-app/tsconfig.app.json`
- [ ] 在 `nest-cli.json` 中注册项目

### 添加新库时

- [ ] 创建 `packages/new-lib/tsconfig.json`
- [ ] 设置 `extends: "../../tsconfig.json"`
- [ ] 在所有应用的 `paths` 中添加库的映射
- [ ] 在 `nest-cli.json` 中注册项目

---

## 🎯 最佳实践

1. ✅ **根配置保持简洁** - 只包含通用编译选项
2. ✅ **子项目独立配置 paths** - 避免路径解析混乱
3. ✅ **保持一致性** - 所有应用使用相同的 baseUrl 策略
4. ✅ **使用路径别名** - `@base/*` 比相对路径更清晰
5. ✅ **IDE 配置和构建配置分离** - tsconfig.json vs tsconfig.app.json

---

## 🔍 常见问题

### Q1: 为什么 IDE 提示找不到模块？

**A:** 检查应用的 `tsconfig.json`：
1. `baseUrl` 是否指向根目录 (`"../../"`)
2. `paths` 是否包含所需的模块映射
3. 重启 TypeScript 服务（VS Code: Cmd+Shift+P → "Restart TS Server"）

### Q2: 构建成功但 IDE 报错？

**A:** IDE 使用 `tsconfig.json`，构建使用 `tsconfig.app.json`
- 确保两个文件的 `paths` 配置一致

### Q3: 是否可以在根目录定义 paths？

**A:** 可以，但不推荐：
- 会和子项目的 baseUrl 产生冲突
- 增加配置复杂度
- 不如让每个子项目独立配置清晰

---

**最后更新:** 2026-02-05
