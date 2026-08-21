import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EntityManager } from "@mikro-orm/postgresql";
import * as argon2 from "argon2";
import { Permission, Role, RolePermission, User, UserRole } from "@/database/entities";
import type { CreateRoleDto, CreateUserDto, UpdateRoleDto, UpdateUserDto } from "./identity.dto";

@Injectable()
export class IdentityService {
  constructor(private readonly em: EntityManager) {}

  async createUser(input: CreateUserDto): Promise<{ id: string }> {
    // 用户和角色关系必须在同一个事务中创建，避免出现“用户已存在但角色没写入”的半成品。
    return this.em.transactional(async (em) => {
      if (await em.findOne(User, { email: input.email })) throw new ConflictException("邮箱已存在");
      if (await em.findOne(User, { username: input.username })) throw new ConflictException("用户名已存在");
      const roles = input.roleIds.length
        ? await em.find(Role, { id: { $in: input.roleIds }, deletedAt: null, enabled: true })
        : [];
      if (roles.length !== input.roleIds.length) throw new BadRequestException("包含不存在或已禁用的角色");
      const user = em.create(User, {
        username: input.username,
        email: input.email,
        displayName: input.displayName,
        passwordHash: await argon2.hash(input.password, { type: argon2.argon2id }),
        isPlatformOwner: false,
      });
      em.persist(user);
      for (const roleId of input.roleIds) em.persist(em.create(UserRole, { userId: user.id, roleId }));
      await em.flush();
      return { id: user.id };
    });
  }

  async updateUser(id: string, input: UpdateUserDto): Promise<void> {
    const user = await this.em.findOne(User, { id, deletedAt: null });
    if (!user) throw new NotFoundException("用户不存在");
    if (user.isPlatformOwner && input.status === "disabled") throw new ConflictException("平台所有者不能被禁用");
    if (input.displayName !== undefined) user.displayName = input.displayName;
    if (input.status !== undefined) user.status = input.status;
    await this.em.flush();
  }

  async assignRoles(userId: string, roleIds: string[]): Promise<void> {
    // 分配角色采用“整组替换”，调用方提交的 roleIds 就是最终结果，便于理解和重试。
    await this.em.transactional(async (em) => {
      const user = await em.findOne(User, { id: userId, deletedAt: null });
      if (!user) throw new NotFoundException("用户不存在");
      const roles = roleIds.length ? await em.find(Role, { id: { $in: roleIds }, deletedAt: null, enabled: true }) : [];
      if (roles.length !== roleIds.length) throw new BadRequestException("包含不存在或已禁用的角色");
      await em.nativeDelete(UserRole, { userId });
      for (const roleId of roleIds) em.persist(em.create(UserRole, { userId, roleId }));
      await em.flush();
    });
  }

  async listRoles() {
    return this.em.find(Role, { deletedAt: null }, { orderBy: { createdAt: "desc" }, fields: ["id", "code", "name", "description", "enabled", "createdAt"] });
  }

  async createRole(input: CreateRoleDto): Promise<{ id: string }> {
    // 角色是数据库动态数据，不在代码中枚举 super_admin/admin/user 等固定集合。
    if (await this.em.findOne(Role, { code: input.code })) throw new ConflictException("角色编码已存在");
    const role = this.em.create(Role, { code: input.code, name: input.name, description: input.description ?? null });
    this.em.persist(role);
    await this.em.flush();
    return { id: role.id };
  }

  async updateRole(id: string, input: UpdateRoleDto): Promise<void> {
    const role = await this.em.findOne(Role, { id, deletedAt: null });
    if (!role) throw new NotFoundException("角色不存在");
    if (input.name !== undefined) role.name = input.name;
    if (input.description !== undefined) role.description = input.description;
    if (input.enabled !== undefined) role.enabled = input.enabled;
    await this.em.flush();
  }

  async assignPermissions(roleId: string, permissionIds: string[]): Promise<void> {
    // 权限关系同样整组替换；权限定义来自 migration，角色关系来自管理 API。
    await this.em.transactional(async (em) => {
      const role = await em.findOne(Role, { id: roleId, deletedAt: null });
      if (!role) throw new NotFoundException("角色不存在");
      const permissions = permissionIds.length
        ? await em.find(Permission, { id: { $in: permissionIds }, deletedAt: null })
        : [];
      if (permissions.length !== permissionIds.length) throw new BadRequestException("包含不存在的权限");
      await em.nativeDelete(RolePermission, { roleId });
      for (const permissionId of permissionIds) em.persist(em.create(RolePermission, { roleId, permissionId }));
      await em.flush();
    });
  }

  async listPermissions() {
    return this.em.find(Permission, { deletedAt: null }, { orderBy: { group: "asc", code: "asc" }, fields: ["id", "code", "name", "group", "description"] });
  }
}
