import * as bcrypt from "bcrypt";
import {
	BadRequestException,
	ConflictException,
	Injectable,
} from "@nestjs/common";
import { LockMode, UniqueConstraintViolationException } from "@mikro-orm/core";
import { EntityManager } from "@mikro-orm/postgresql";
import { SUPER_ADMIN_ROLE_CODE } from "@/modules/role/role.constants";
import { RoleEntity } from "@/modules/role/entities";
import { UserDataService } from "./user-data.service";
import { UserEntity, UserRoleEntity } from "./entities";

@Injectable()
export class UserQuery {
	constructor(
		private readonly em: EntityManager,
		private readonly data: UserDataService,
	) {}

	normalizeUserName(userName: string): string {
		return this.data.normalizeUserName(userName);
	}

	findActiveUser(em: EntityManager, id: number) {
		return this.data.findActiveUser(em, id);
	}

	isRoleAssigned(em: EntityManager, roleId: number) {
		return this.data.isRoleAssigned(em, roleId);
	}

	isDepartmentAssigned(em: EntityManager, deptId: number) {
		return this.data.isDepartmentAssigned(em, deptId);
	}

	async verifyLogin(
		em: EntityManager,
		userName: string,
		password: string,
	): Promise<{ id: number; userName: string } | null> {
		const normalized = this.data.normalizeUserName(userName);
		const user = await this.data.findUserForLogin(em, normalized);
		if (!user || user.status !== 1) return null;
		if (!(await bcrypt.compare(password, user.passwordHash))) return null;
		return { id: user.id, userName: user.userName };
	}

	/** 确保超级管理员存在并拥有超管角色；重复执行不重置密码。 */
	async ensureSuperAdmin(
		dto: { userName?: string; password?: string },
		retry = false,
	): Promise<number> {
		try {
			return await this.em.transactional(async (em) => {
				const role = await em.findOne(
					RoleEntity,
					{ roleCode: SUPER_ADMIN_ROLE_CODE, deletedAt: null },
					{ fields: ["id"], lockMode: LockMode.PESSIMISTIC_WRITE },
				);
				if (!role) throw new ConflictException("超级管理员角色初始化失败");

				const relation = await em.findOne(UserRoleEntity, { role }, { fields: ["user.id"] });
				if (relation) {
					const existingUser = await em.findOne(
						UserEntity,
						{ id: relation.user.id },
						{ fields: ["id", "status", "deletedAt"] },
					);
					if (existingUser) {
						if (existingUser.status !== 1) existingUser.status = 1;
						if (existingUser.deletedAt !== null) existingUser.deletedAt = null;
						await em.flush();
						return existingUser.id;
					}
				}

				if (!dto.userName || !dto.password) {
					throw new BadRequestException("首次初始化必须提供超级管理员账号和密码");
				}
				const userName = this.data.normalizeUserName(dto.userName);
				if (await em.findOne(UserEntity, { userName, deletedAt: null }, { fields: ["id"] })) {
					throw new ConflictException("超级管理员账号已被其他用户使用");
				}

				const user = em.create(UserEntity, {
					userName,
					displayName: "超级管理员",
					passwordHash: await this.data.hashPassword(dto.password),
					status: 1,
				});
				await em.flush();
				await this.data.addUserRoles(em, user.id, [role.id]);
				return user.id;
			});
		} catch (error) {
			if (error instanceof UniqueConstraintViolationException && !retry) {
				return this.ensureSuperAdmin(dto, true);
			}
			throw error;
		}
	}
}
