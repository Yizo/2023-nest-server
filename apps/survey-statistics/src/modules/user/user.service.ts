import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, QueryBuilder } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "./entities/user.entity";
import { Role } from "@/modules/role/entities/role.entity";
import { UserRole } from "./entities/userRole.entity";
import { Profile } from "@/modules/profile/profile.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryBuilderFactory, QueryBuilderHelper } from "@base/commons";
import { RoleType } from "@/enums/role";

const defaultPassword = "123456";
const superAdminUserInfo = {
	username: "superAdmin",
	password: defaultPassword,
	email: "superadmin@example.com",
	isActive: 1,
};

@Injectable()
export class UserService {
	private userQueryBuilder: QueryBuilderHelper<User>;
	private userBuilder: QueryBuilder<User>;
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		@InjectRepository(Role)
		private readonly roleRepository: Repository<Role>,
		private readonly queryBuilderFactory: QueryBuilderFactory,
		private readonly logger: Logger,
	) {
		this.userQueryBuilder = this.queryBuilderFactory.createFromRepository(this.userRepository);
		this.userBuilder = this.userRepository.createQueryBuilder("user");
	}

	async list(page, pageSize) {
		return await this.userQueryBuilder.findPaginated(
			{
				orderBy: [{ field: "updatedAt", direction: "DESC" }],
			},
			page,
			pageSize,
		);
	}

	// 查询用户详情
	/**
	 * 查询用户详情（支持多角色）
	 * 使用 getRawMany() 处理一对多关系
	 */
	async findUserDetail(id: string) {
		const user = await this.findUserByIdentifier("id", id);
		if (!user) {
			throw new BadRequestException("用户不存在");
		}

		const rawData = await this.userQueryBuilder
			.buildQuery({
				alias: "u",
				joins: [
					{ property: "userRoles", alias: "ur", type: "leftJoin" },
					{ property: "ur.role", alias: "role", type: "leftJoin" },
					{ property: "profile", alias: "p", type: "leftJoin" },
				],
				conditions: [
					{ field: "u.id", operator: "eq", value: id },
					{ field: "u.isActive", operator: "eq", value: true },
				],
				select: [
					"u.id as userId",
					"u.username as username",
					"u.email as email",
					"u.createdAt as createdAt",
					"u.updatedAt as updatedAt",
					"p.bio as bio",
					"role.id as roleId",
					"role.name as roleName",
					"role.code as roleCode",
					"role.description as roleDescription",
				],
			})
			.getRawMany();

		if (!rawData || rawData.length === 0) {
			return null;
		}

		// 手动聚合：将多行数据合并为一个对象，roles 作为数组
		const firstRow = rawData[0];
		return {
			id: firstRow.userId,
			username: firstRow.username,
			email: firstRow.email,
			createdAt: firstRow.createdAt,
			updatedAt: firstRow.updatedAt,
			bio: firstRow.bio,
			roles: rawData
				.filter((row) => row.roleId) // 过滤掉没有角色的行
				.map((row) => ({
					id: row.roleId,
					name: row.roleName,
					code: row.roleCode,
					description: row.roleDescription,
				})),
		};
	}

	// 查询某个角色的用户
	async findUsersByRole(
		roleCode: RoleType[],
		{ page = 1, pageSize = 10 }: { page?: number; pageSize?: number } = {},
	) {
		const users = await this.userQueryBuilder.findPaginated(
			{
				joins: [
					{ property: "userRoles", alias: "ur", type: "leftJoinAndSelect" },
					{ property: "ur.role", alias: "role", type: "leftJoinAndSelect" },
				],
				conditions: [
					{ field: "role.code", operator: "in", value: roleCode },
					{ field: "isActive", operator: "eq", value: 1 },
				],
			},
			page,
			pageSize,
		);

		users.data = users.data.map((user) => {
			const roles = user.userRoles.map((role) => {
				return role.role;
			});
			Reflect.deleteProperty(user, "userRoles");
			return {
				...user,
				roles,
			};
		});

		return users;
	}

	// 创建超级管理员
	async createSuperAdmin() {
		const superAdmin = await this.findUsersByRole([RoleType.SuperAdmin]);
		if (superAdmin.total > 0) {
			return false;
		}

		const hashedPassword = await bcrypt.hash(superAdminUserInfo.password, 10);

		return this.userRepository.manager.transaction(async (manager) => {
			// 1. 插入超级管理员
			const insertUserResult = await manager
				.createQueryBuilder()
				.insert()
				.into(User)
				.values({
					username: superAdminUserInfo.username,
					password: hashedPassword,
					email: superAdminUserInfo.email,
					isActive: superAdminUserInfo.isActive,
				})
				.execute();

			// 2. 查询超级管理员角色
			const superAdminRole = await manager.getRepository(Role).findOne({
				where: { code: RoleType.SuperAdmin },
			});
			if (!superAdminRole) {
				throw new BadRequestException("超级管理员角色不存在");
			}

			// 3. 关联用户-角色
			await manager
				.createQueryBuilder()
				.insert()
				.into(UserRole)
				.values({
					user: { id: insertUserResult.identifiers[0].id },
					role: { id: superAdminRole.id },
				})
				.execute();

			return true;
		});
	}

	async create(dto: CreateUserDto): Promise<User> {
		const exists = await this.userRepository.findOne({
			where: [{ username: dto.username }, { email: dto.email }],
		});
		if (exists) {
			throw new BadRequestException("用户名或邮箱已存在");
		}

		const hashed = await bcrypt.hash(dto.password ?? defaultPassword, 10);

		return await this.userRepository.manager.transaction(async (manager) => {
			const user = manager.create(User, {
				...dto,
				password: hashed,
			});
			const savedUser = await manager.save(user);

			// 用户-角色关联 - 为新用户分配普通用户角色
			const userRole = await this.roleRepository.findOne({
				where: { code: RoleType.User },
			});
			if (userRole) {
				const userRoleRelation = manager.create(UserRole, {
					user: savedUser,
					role: userRole,
				});
				await manager.save(userRoleRelation);
			}

			return savedUser;
		});
	}

	async update(dto: UpdateUserDto) {
		const { id } = dto;
		const user = await this.findUserByIdentifier("id", id);
		if (!user) {
			throw new BadRequestException("用户不存在");
		}

		if (dto.username && dto.username !== user.username) {
			const exists = await this.userRepository.findOne({
				where: { username: dto.username },
				withDeleted: true,
			});
			if (exists && exists.id !== id) {
				throw new BadRequestException("用户名已存在");
			}
		}

		if (dto.email && dto.email !== user.email) {
			const exists = await this.userRepository.findOne({
				where: { email: dto.email },
				withDeleted: true,
			});
			if (exists && exists.id !== id) {
				throw new BadRequestException("邮箱已存在");
			}
		}

		Object.assign(user, dto);
		try {
			return this.userRepository.save(user);
		} catch (error) {
			throw new BadRequestException();
		}
	}

	async remove(id: string) {
		// 检查用户是否存在
		const user = await this.findUserByIdentifier("id", id);
		if (!user) return false;
		// 软删除
		await this.userRepository.softDelete(id);
		return true;
	}

	/*************************静态方法, 不提供路由访问*****************************/
	async findUserByIdentifier(key: "id" | "username", value: string) {
		const user = await this.userRepository.findOne({
			where: { [key]: value },
			select: ["id", "username", "password"],
		});
		if (!user) {
			throw new BadRequestException("用户不存在");
		}
		if (user?.isActive === 0) {
			throw new BadRequestException("用户已禁用");
		}
		return user;
	}
	/*************************静态方法, 不提供路由访问*****************************/
}
