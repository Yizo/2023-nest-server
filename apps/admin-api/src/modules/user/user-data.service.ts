import * as bcrypt from "bcrypt";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { LoadStrategy, LockMode } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { DepartmentEntity } from "@/modules/department/entities";
import { RoleEntity } from "@/modules/role/entities";
import { UserResult } from "./dto";
import { UserDepartmentEntity, UserEntity, UserRoleEntity } from "./entities";

const BCRYPT_SALT_ROUNDS = 10;

type UserView = Pick<
	UserEntity,
	"id" | "userName" | "displayName" | "status" | "createdAt" | "updatedAt"
>;
type UserWriteEntity = UserView & Pick<UserEntity, "deletedAt"> & Partial<Pick<UserEntity, "passwordHash">>;

@Injectable()
export class UserDataService {
	// 公共方法

	/** 把用户 Entity 转成接口结果，密码哈希不会返回。 */
	toUserResult(entity: UserView, roleIds: number[], deptIds: number[]): UserResult {
		return {
			id: entity.id,
			userName: entity.userName,
			displayName: entity.displayName,
			roleIds: [...roleIds].sort((left, right) => left - right),
			deptIds: [...deptIds].sort((left, right) => left - right),
			status: entity.status,
			createdAt: entity.createdAt,
			updatedAt: entity.updatedAt,
		};
	}

	/** 密码只保存 bcrypt 哈希，不能把明文写进数据库。 */
	async hashPassword(password: unknown): Promise<string> {
		if (typeof password !== "string") throw new BadRequestException("密码必须是字符串");
		return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
	}

	/** 用户账号统一去掉首尾空白并转小写，避免大小写不同却创建重复账号。 */
	normalizeUserName(userName: string): string {
		const normalized = userName.trim().toLowerCase();
		if (!normalized) throw new BadRequestException("用户账号不能为空");
		return normalized;
	}

	// 数据方法

	/** 查询用户公开字段，并加载角色和部门 ID。 */
	async findUserView(em: EntityManager, id: number) {
		const entity = await em.findOne(
			UserEntity,
			{ id, deletedAt: null },
			{
				fields: [
					"id",
					"userName",
					"displayName",
					"status",
					"createdAt",
					"updatedAt",
					"roles.id",
					"departments.id",
				],
				populate: ["roles:ref", "departments:ref"],
				strategy: LoadStrategy.SELECT_IN,
				refresh: true,
			},
		);
		if (!entity) throw new NotFoundException("用户不存在");
		return entity;
	}

	/** 修改或删除用户时加载用户字段，并按需要锁定用户避免同时修改。 */
	async findUserEntity(
		em: EntityManager,
		id: number,
		lockForWrite = false,
	): Promise<UserWriteEntity> {
		const entity = await em.findOne(
			UserEntity,
			{ id, deletedAt: null },
			{
				fields: ["id", "userName", "displayName", "status", "createdAt", "updatedAt", "deletedAt"],
				refresh: true,
				...(lockForWrite ? { lockMode: LockMode.PESSIMISTIC_WRITE } : {}),
			},
		);
		if (!entity) throw new NotFoundException("用户不存在");
		return entity;
	}

	/** 查询用户当前拥有的角色 ID。 */
	async findRoleIds(em: EntityManager, userId: number): Promise<number[]> {
		const relations = await em.find(
			UserRoleEntity,
			{ user: em.getReference(UserEntity, userId) },
			{ fields: ["role.id"] },
		);
		return relations.map((relation) => relation.role.id);
	}

	/** 查询用户当前所属的部门 ID。 */
	async findDepartmentIds(em: EntityManager, userId: number): Promise<number[]> {
		const relations = await em.find(
			UserDepartmentEntity,
			{ user: em.getReference(UserEntity, userId) },
			{ fields: ["department.id"] },
		);
		return relations.map((relation) => relation.department.id);
	}

	/** 检查角色是否都存在、启用且未软删除，并锁定角色避免同时删除。 */
	async assertRolesAvailable(em: EntityManager, roleIds: number[]): Promise<void> {
		if (!roleIds.length) return;

		const roles = await em.find(
			RoleEntity,
			{ id: { $in: roleIds }, deletedAt: null, status: 1 },
			{ fields: ["id"], lockMode: LockMode.PESSIMISTIC_READ },
		);
		if (roles.length !== roleIds.length) {
			throw new NotFoundException("存在不存在、已删除或已停用的角色");
		}
	}

	/** 检查部门是否都存在、启用且未软删除，并锁定部门避免同时删除。 */
	async assertDepartmentsAvailable(em: EntityManager, deptIds: number[]): Promise<void> {
		if (!deptIds.length) return;

		const departments = await em.find(
			DepartmentEntity,
			{ id: { $in: deptIds }, deletedAt: null, status: 1 },
			{ fields: ["id"], lockMode: LockMode.PESSIMISTIC_READ },
		);
		if (departments.length !== deptIds.length) {
			throw new NotFoundException("存在不存在、已删除或已停用的部门");
		}
	}

	/** 删除用户不再拥有的角色关联。 */
	async removeUserRoles(em: EntityManager, userId: number, roleIds: number[]): Promise<void> {
		if (!roleIds.length) return;

		await em.nativeDelete(UserRoleEntity, {
			user: em.getReference(UserEntity, userId),
			role: { id: { $in: roleIds } },
		});
	}

	/** 新增用户刚分配的角色关联。 */
	async addUserRoles(em: EntityManager, userId: number, roleIds: number[]): Promise<void> {
		if (!roleIds.length) return;

		const user = em.getReference(UserEntity, userId);
		await em.insertMany(
			UserRoleEntity,
			roleIds.map((roleId) => ({
				user,
				role: em.getReference(RoleEntity, roleId),
			})),
		);
	}

	/** 删除用户不再拥有的部门关联。 */
	async removeUserDepartments(em: EntityManager, userId: number, deptIds: number[]): Promise<void> {
		if (!deptIds.length) return;

		await em.nativeDelete(UserDepartmentEntity, {
			user: em.getReference(UserEntity, userId),
			department: { id: { $in: deptIds } },
		});
	}

	/** 新增用户刚分配的部门关联。 */
	async addUserDepartments(em: EntityManager, userId: number, deptIds: number[]): Promise<void> {
		if (!deptIds.length) return;

		const user = em.getReference(UserEntity, userId);
		await em.insertMany(
			UserDepartmentEntity,
			deptIds.map((deptId) => ({
				user,
				department: em.getReference(DepartmentEntity, deptId),
			})),
		);
	}

	/** 删除用户前，清理该用户的全部角色和部门关联。 */
	async clearUserAssignments(em: EntityManager, userId: number): Promise<void> {
		const user = em.getReference(UserEntity, userId);
		await em.nativeDelete(UserRoleEntity, { user });
		await em.nativeDelete(UserDepartmentEntity, { user });
	}

	/** 查看角色是否仍然分配给至少一个用户。 */
	async isRoleAssigned(em: EntityManager, roleId: number): Promise<boolean> {
		const relation = await em.findOne(
			UserRoleEntity,
			{ role: em.getReference(RoleEntity, roleId) },
			{ fields: ["user"] },
		);
		return relation !== null;
	}

	/** 查看部门是否仍然关联至少一个用户。 */
	async isDepartmentAssigned(em: EntityManager, deptId: number): Promise<boolean> {
		const relation = await em.findOne(
			UserDepartmentEntity,
			{ department: em.getReference(DepartmentEntity, deptId) },
			{ fields: ["user"] },
		);
		return relation !== null;
	}
}
