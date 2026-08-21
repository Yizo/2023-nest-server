# 前端接口迁移说明

适用前端项目：`2025-react`。

本次后端为全新接口结构，前端管理页面需要从旧路径切换到新路径。后端已经补充分页列表和监控 SDK 接入接口，前端不需要继续使用旧 `/roles/*`、`/dictionary/*`、`/error-report/systems/*` 管理接口。

## 1. 通用响应结构

所有成功响应格式：

```ts
interface ApiResponse<T> {
  code: 0;
  message: '成功';
  data: T;
  requestId: string;
  timestamp: string;
}
```

分页接口的 `data`：

```ts
interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
```

前端表格读取方式：

```ts
return request.get('/api/identity/roles', { params }).then((res) => ({
  list: res.data.items,
  total: res.data.total,
}));
```

注意：不是 `list: res.data`，因为 `res.data` 是分页对象。

## 2. 角色管理

修改文件：`src/pages/admin/role/api.ts`。

### 接口映射

| 旧接口 | 新接口 |
| --- | --- |
| `GET /api/roles/list` | `GET /api/identity/roles` |
| `POST /api/roles/create` | `POST /api/identity/roles` |
| `POST /api/roles/update` | `POST /api/identity/roles/:id/update` |
| `POST /api/roles/remove/:id` | 不再物理删除，改成更新 `enabled=false` |

### 查询参数

```ts
interface RoleListQuery {
  page?: number;
  pageSize?: number;
  name?: string;
  code?: string;
  description?: string;
  enabled?: boolean;
}
```

### 前端 API 示例

```ts
interface RoleForm {
  code: string;
  name: string;
  description?: string;
}

export function getRoleList(params: RoleListQuery) {
  return request.get('/api/identity/roles', { params });
}

export function createRole(data: RoleForm) {
  return request.post('/api/identity/roles', data);
}

export function updateRole(id: string, data: {
  name?: string;
  description?: string;
  enabled?: boolean;
}) {
  return request.post(`/api/identity/roles/${id}/update`, data);
}

export function disableRole(id: string) {
  return updateRole(id, { enabled: false });
}
```

角色编码 `code` 创建后不可修改。编辑弹窗中应禁用角色编码输入框。

`list.tsx` 修改：

```ts
return getRoleList(queryParams).then((res) => ({
  list: res.data.items,
  total: res.data.total,
}));
```

删除按钮应改成“禁用”，或者根据 `enabled` 显示“启用/禁用”。

## 3. 字典管理

修改文件：`src/pages/admin/dictionary/api.ts`、`type-list.tsx`、`data-list.tsx`。

### 字典类型接口

| 旧接口 | 新接口 |
| --- | --- |
| `GET /api/dictionary/types/list` | `GET /api/system/dictionary-types` |
| `POST /api/dictionary/types/create` | `POST /api/system/dictionary-types` |
| `POST /api/dictionary/types/update` | `POST /api/system/dictionary-types/:id/update` |
| 删除类型 | 更新 `enabled=false` |

查询参数：

```ts
interface DictionaryTypeListQuery {
  page?: number;
  pageSize?: number;
  name?: string;
  code?: string;
  enabled?: boolean;
  sort?: 'asc' | 'desc';
}
```

创建字典类型：

```ts
request.post('/api/system/dictionary-types', {
  code: 'survey_status',
  name: '问卷状态',
});
```

旧页面只有 `name/status/description`，需要增加必填 `code` 字段。新后端暂不保存字典类型 `description`。

字段映射：

```text
旧 status=1  → 新 enabled=true
旧 status=0  → 新 enabled=false
旧 res.data  → 新 res.data.items
```

### 字典项接口

| 旧接口 | 新接口 |
| --- | --- |
| `GET /api/dictionary/data/list` | `GET /api/system/dictionary-items` |
| `POST /api/dictionary/data/create` | `POST /api/system/dictionary-items` |
| `POST /api/dictionary/data/update` | `POST /api/system/dictionary-items/:id/update` |
| 删除字典项 | 更新 `enabled=false` |

查询参数：

```ts
interface DictionaryItemListQuery {
  dictTypeId: string;
  page?: number;
  pageSize?: number;
  label?: string;
  value?: string;
  enabled?: boolean;
  sort?: 'asc' | 'desc';
}
```

字段映射：

```text
旧 typeId     → 新 dictTypeId（UUID 字符串）
旧 name       → 新 label
旧 status     → 新 enabled（boolean）
旧 res.data   → 新 res.data.items
```

创建字典项：

```ts
request.post('/api/system/dictionary-items', {
  dictTypeId,
  label: '草稿',
  value: 'draft',
  sortOrder: 0,
});
```

## 4. 监控应用管理

修改文件：`src/pages/admin/monitor/api.ts`、`types.ts`、`list.tsx`、`detail.tsx`。

### 接口映射

| 旧接口 | 新接口 |
| --- | --- |
| `GET /api/error-report/systems/list` | `GET /api/monitoring/apps` |
| `GET /api/error-report/systems/:id` | 列表中直接使用应用数据，当前无独立详情接口 |
| `POST /api/error-report/systems/create` | `POST /api/monitoring/apps` |
| `POST /api/error-report/systems/update` | `POST /api/monitoring/apps/:id/update` |
| 删除系统 | 更新 `enabled=false` |
| `GET /api/error-report/logs` | `GET /api/monitoring/client-errors` |

### 类型调整

```ts
interface MonitorApp {
  id: string;          // UUID，不再是 number
  code: string;        // 代替旧 appId
  name: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}
```

列表查询：

```ts
request.get('/api/monitoring/apps', {
  params: {
    page,
    pageSize,
    name,
    code,
    enabled,
  },
});
```

创建监控应用：

```ts
const response = await request.post('/api/monitoring/apps', {
  code: 'survey-admin',
  name: 'Survey Admin',
});

// response.data.ingestKey 只在创建时返回一次，页面必须立即显示并提示复制。
```

创建响应：

```ts
interface CreateMonitorAppResult {
  id: string;
  ingestKey: string;
}
```

更新：

```ts
request.post(`/api/monitoring/apps/${id}/update`, {
  name,
  enabled,
});
```

### 错误日志列表

新接口使用“下一页标记”，不再提供页码总数：

```ts
request.get('/api/monitoring/client-errors', {
  params: {
    appId: monitorApp.id,
    pageSize: 20,
    cursor: nextCursor,
    fingerprint,
  },
});
```

响应：

```ts
interface CursorResult<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}
```

`detail.tsx` 不能继续使用依赖 `total/page` 的普通页码分页，需要改成“加载更多”或维护每一页对应的 `cursor`。

错误分组接口：

```text
GET /api/monitoring/error-groups/:appId
```

## 5. 前端监控 SDK 上报

Vite 中已经存在 `/api/error-report` 代理，不需要修改代理路径。HAR 中浏览器显示 5173 地址是正常的，代理后由后端处理。

环境变量：

```env
VITE_MONITOR_URL=/api/error-report
VITE_MONITOR_APP_ID=survey-admin
VITE_MONITOR_INGEST_KEY=创建监控应用时返回的ingestKey
```

修改 `src/monitor/index.ts`，发送前为每条 SDK 数据增加 `ingestKey`：

```ts
function createMonitorTransport(dsn: string): NonNullable<MonitorConfig['transport']> {
  return async (payloads) => {
    const ingestKey = import.meta.env.VITE_MONITOR_INGEST_KEY;
    const body = JSON.stringify(
      payloads.map((payload) => ({
        ...payload,
        ingestKey,
      }))
    );

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(dsn, blob)) return;
    }

    await fetch(dsn, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  };
}
```

后端接入接口：

```text
POST /api/error-report
```

支持：

- 单条对象；
- 批量数组；
- 最多 100 条；
- 重复上报自动去重；
- 嵌套的 password、token、authorization、cookie、secret 字段自动删除；
- 成功后进入 BullMQ 异步聚合。

成功响应：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "accepted": 1,
    "duplicates": 0
  }
}
```

## 6. 登录响应

登录接口：

```text
POST /api/auth/login
```

请求：

```json
{
  "username": "superAdmin",
  "password": "本地配置密码"
}
```

响应中已经包含前端需要的用户信息：

```ts
dispatch(setUser({
  token: data.accessToken,
  userInfo: {
    id: data.user.id,
    name: data.user.username,
  },
}));
```

## 7. 推荐修改顺序

```text
1. 修改角色 API 和分页响应读取
2. 修改字典字段及 API
3. 修改监控应用类型和 API
4. 创建 code=survey-admin 的监控应用并保存 ingestKey
5. 修改监控 transport 注入 ingestKey
6. 修改日志详情为下一页标记分页
7. 联调并重新导出 HAR，确认没有 404
```

## 8. 前端认证错误码处理

删除旧的 `status === 491` 判断，改为读取后端响应体 `code`：

```ts
switch (errorData?.code) {
  case 1001: // 缺少 Access Token
  case 1003: // Access Token 无效
  case 1004: // Refresh Token 无效
  case 1005: // 用户不存在或已停用
    store.dispatch(clearUser());
    break;
  case 1002: // Access Token 过期
    // 有自动刷新流程时先刷新；否则清理登录状态。
    store.dispatch(clearUser());
    break;
}
```

HTTP 状态仍然是 401，业务 `code` 用来区分前端需要执行的动作。
