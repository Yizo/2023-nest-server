# admin-api 权限架构

## 目标

- 认证只确认当前请求的用户身份。
- 接口权限只确认当前用户能否执行指定操作。
- 菜单只负责展示页面入口和操作权限，不承担数据范围控制。
- 角色与菜单通过 `sys_role_menu` 显式关联。
- 模块依赖必须是 DAG，禁止 `forwardRef`。

## 认证

- `AuthService` 负责登录、刷新令牌和注销。密码比对在 `UserQuery.verifyLogin`。
- `AuthGuard` 只校验 JWT，并把有效用户放入请求上下文。
- `@Public()` 标记无需认证的接口。
- `@AuthRequired()` 标记需要认证但不要求具体操作权限的接口。
- `@RequirePermissions()` 同时要求认证和操作权限。
- 未标注路由默认拒绝。
- 认证失败统一返回未认证错误。
- `APP_GUARD` 只在 `AppModule` 注册，顺序为先 `AuthGuard` 后 `PermissionGuard`。功能模块不得自行注册 `APP_GUARD`（`Auth → User → Access` 的加载顺序会倒置守卫）。

## 接口权限

- `PermissionGuard` 读取 `@RequirePermissions()` 并调用 `PermissionService`。
- `PermissionService` 只属于 Access 模块，是权限和菜单树的唯一读模型。
- 超级管理员由特殊角色编码识别，拥有全部操作权限。
- 普通用户必须拥有接口声明的全部操作编码。
- 接口权限不负责过滤业务数据；业务 Service 按业务条件查询数据。

## 菜单类型

- `page`：页面入口，必须有页面路径和组件。
- `menu`：菜单层级节点，用来组织页面或子菜单。
- `external`：外部链接，必须有外链地址。
- `action`：操作权限，必须有唯一操作编码，不生成页面菜单。
- 菜单树只返回可访问、未删除且可显示的非操作节点。
- 操作编码只从 `action` 类型菜单中读取。

## 表归属

- User 拥有 `sys_user`、`sys_user_role`、`sys_user_department`。
- Role 拥有 `sys_role`、`sys_role_menu`。
- Menu 拥有 `sys_menu`。删除菜单时只能通过 `RoleGrantCommand.clearGrantsByMenu` 清关联。
- 不使用 ORM 集合方法、级联写入或隐式关系同步。

## 缓存

- `PermissionCacheService` 属于 Access，只给 Access 内部使用。
- Redis 基础设施只提供连接，不认识权限 key 或菜单结构。
- 写侧只调用 `AccessInvalidation.invalidateUser/Role/Menu`，由 Access 查出受影响用户。
- `removeMenu` 以及任何会清空 `sys_role_menu` 的删除，必须在删除 `role_menu` 行之前调用 `invalidateMenu`。`invalidateMenu` 同时失效超级管理员用户（他们通常没有 `role_menu` 行）。
- `createMenu` 在事务提交后失效，以便刷新超级管理员的菜单缓存。
- 缓存不可用或失效失败时只记录警告；权限查询必须回源数据库，不能放宽权限。

## 跨模块端口

- User 只导出 `UserQuery`。
- Role 只导出 `RoleGrantCommand`。
- Access 导出 `PermissionService`、`AccessInvalidation` 和 `PermissionGuard`（供 `AppModule` 注册全局守卫）。
- Auth 导出 `AuthService` 和 `AuthGuard`。
- 禁止注入他模块的 `*DataService`。
- 实体 class 可以跨模块引用；Nest Module 不行，除非走上述端口。

## 新模块清单

1. 拥有哪几张表？没有表就不要建模块。
2. 导出白名单是什么？默认空。
3. 要用别人的数据时走对方端口；没有端口就在对方模块加，禁止注入对方 DataService。
4. 写入会改变操作权限或菜单树时，只调一个 `invalidate*`。
5. Controller 只用 `@Public` / `@AuthRequired` / `@RequirePermissions`。
6. 禁止 `forwardRef`、循环 import、以及把业务 DTO 放进 common/infra。
