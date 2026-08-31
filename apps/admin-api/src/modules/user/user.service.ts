import { ConflictException, Injectable } from "@nestjs/common";
import {
	type FilterQuery,
	LoadStrategy,
	UniqueConstraintViolationException,
} from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { getOffsetPagination, type PageResult } from "@/common/pagination";
import { getIdDiff, normalizeIds } from "@/common/utils";
import { CreateUserDto, QueryUserDto, UpdateUserDto, UserResult } from "./dto";
import { UserEntity } from "./entities";
import { UserDataService } from "./user-data.service";

@Injectable()
export class UserService {
	constructor(
		private readonly em: EntityManager,
		private readonly data: UserDataService,
	) {}

	// 用户方法

	/** 修改用户角色；只删除移除的角色，只新增新分配的角色。 */
	private async replaceRoles(em: EntityManager, userId: number, roleIds: unknown): Promise<number[]> {
		const targetIds = normalizeIds(roleIds, "角色 ID");
		await this.data.assertRolesAvailable(em, targetIds);
		const currentIds = await this.data.findRoleIds(em, userId);
		const { toAdd, toRemove } = getIdDiff(currentIds, targetIds);

		await this.data.removeUserRoles(em, userId, toRemove);
		await this.data.addUserRoles(em, userId, toAdd);
		return targetIds;
	}

	/** 修改用户部门；只删除移除的部门，只新增新分配的部门。 */
	private async replaceDepartments(
		em: EntityManager,
		userId: number,
		deptIds: unknown,
	): Promise<number[]> {
		const targetIds = normalizeIds(deptIds, "部门 ID");
		await this.data.assertDepartmentsAvailable(em, targetIds);
		const currentIds = await this.data.findDepartmentIds(em, userId);
		const { toAdd, toRemove } = getIdDiff(currentIds, targetIds);

		await this.data.removeUserDepartments(em, userId, toRemove);
		await this.data.addUserDepartments(em, userId, toAdd);
		return targetIds;
	}

	/** 创建用户；角色和部门可以现在传入，也可以后续修改。 */
	async createUser(dto: CreateUserDto): Promise<UserResult> {
		const userName = this.data.normalizeUserName(dto.userName);
		const passwordHash = await this.data.hashPassword(dto.password);

		return this.em.transactional(async (em) => {
			if (await em.findOne(UserEntity, { userName, deletedAt: null }, { fields: ["id"] })) {
				throw new ConflictException("用户账号已存在");
			}

			const entity = em.create(UserEntity, {
				userName,
				displayName: dto.displayName,
				passwordHash,
				status: dto.status ?? 1,
			});
			try {
				await em.flush();
			} catch (error) {
				if (error instanceof UniqueConstraintViolationException) {
					throw new ConflictException("用户账号已存在");
				}
				throw error;
			}

			const roleIds =
				dto.roleIds === undefined ? [] : await this.replaceRoles(em, entity.id, dto.roleIds);
			const deptIds =
				dto.deptIds === undefined ? [] : await this.replaceDepartments(em, entity.id, dto.deptIds);
			return this.data.toUserResult(entity, roleIds, deptIds);
		});
	}

	/** 分页查询未删除用户，并通过 ORM 批量加载角色和部门 ID。 */
	async findUsers(query: QueryUserDto): Promise<PageResult<UserResult>> {
		const where: FilterQuery<UserEntity> = { deletedAt: null };
		if (query.userName) where.userName = { $ilike: `%${query.userName}%` };
		if (query.displayName) where.displayName = { $ilike: `%${query.displayName}%` };
		if (query.deptId !== undefined) {
			where.departments = { id: query.deptId, deletedAt: null };
		}
		if (query.status !== undefined) where.status = query.status;

		const [entities, total] = await this.em.findAndCount(UserEntity, where, {
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
			...getOffsetPagination(query),
			orderBy: { createdAt: "desc", id: "desc" },
		});

		return {
			items: entities.map((entity) =>
				this.data.toUserResult(
					entity,
					entity.roles.getIdentifiers<number>(),
					entity.departments.getIdentifiers<number>(),
				),
			),
			total,
			page: query.page,
			pageSize: query.pageSize,
		};
	}

	/** 按主键查询用户，同时返回角色和部门 ID。 */
	async findUser(id: number): Promise<UserResult> {
		const entity = await this.data.findUserView(this.em, id);
		return this.data.toUserResult(
			entity,
			entity.roles.getIdentifiers<number>(),
			entity.departments.getIdentifiers<number>(),
		);
	}

	/** 更新显示名称、密码、部门、角色和状态，用户账号不允许修改。 */
	async updateUser(id: number, dto: UpdateUserDto): Promise<UserResult> {
		const passwordHash =
			dto.password === undefined ? undefined : await this.data.hashPassword(dto.password);

		return this.em.transactional(async (em) => {
			const entity = await this.data.findUserEntity(em, id, true);
			if (dto.displayName !== undefined) entity.displayName = dto.displayName;
			if (passwordHash !== undefined) entity.passwordHash = passwordHash;
			if (dto.status !== undefined) entity.status = dto.status;
			const roleIds =
				dto.roleIds === undefined
					? await this.data.findRoleIds(em, entity.id)
					: await this.replaceRoles(em, entity.id, dto.roleIds);
			const deptIds =
				dto.deptIds === undefined
					? await this.data.findDepartmentIds(em, entity.id)
					: await this.replaceDepartments(em, entity.id, dto.deptIds);

			await em.flush();
			return this.data.toUserResult(entity, roleIds, deptIds);
		});
	}

	/** 删除用户时先清理角色和部门关联，再软删除用户。 */
	async removeUser(id: number): Promise<UserResult> {
		return this.em.transactional(async (em) => {
			const entity = await this.data.findUserEntity(em, id, true);
			await this.data.clearUserAssignments(em, entity.id);

			const now = new Date();
			entity.deletedAt = now;
			entity.updatedAt = now;
			await em.flush();
			return this.data.toUserResult(entity, [], []);
		});
	}
}
