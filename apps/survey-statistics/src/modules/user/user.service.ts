import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "./user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { QueryBuilderFactory, QueryBuilderHelper } from "@base/commons";
import { RoleType } from "@/enums/role";
import { Role } from "@/modules/role/role.entity";
import { UserRole } from "./userRole.entity";

@Injectable()
export class UserService {
	private userQueryBuilder: QueryBuilderHelper<User>;
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
		@InjectRepository(Role)
		private readonly roleRepository: Repository<Role>,
		private readonly queryBuilderFactory: QueryBuilderFactory,
		private readonly logger: Logger,
	) {
		this.userQueryBuilder = this.queryBuilderFactory.createFromRepository(this.userRepository);
	}

	async list(page, pageSize) {
		return await this.userQueryBuilder.findPaginated(
			{
				conditions: [],
				orderBy: [{ field: "updatedAt", direction: "DESC" }],
			},
			page,
			pageSize,
		);
	}

	async findByUsername(username: string) {
		const user = await this.userRepository.findOne({
			where: { username },
		});
		if (user?.isActive === 0) {
			throw new BadRequestException("用户已禁用");
		}
		return user;
	}

	async findById(id: string) {
		const user = await this.userRepository.findOne({
			where: { id },
		});
		if (user?.isActive === 0) {
			throw new BadRequestException("用户已禁用");
		}
		return user;
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
					{ field: "role.code", operator: "in", value: [roleCode] },
					{ field: "isActive", operator: "eq", value: true },
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
		return await this.findUsersByRole([RoleType.SuperAdmin]);
	}

	async create(dto: CreateUserDto): Promise<User> {
		const exists = await this.userRepository.findOne({
			where: [{ username: dto.username }, { email: dto.email }],
		});
		if (exists) {
			throw new BadRequestException("用户名或邮箱已存在");
		}

		const defaultPassword = "123456";
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

	async update(id: string, dto: UpdateUserDto) {
		const user = await this.findById(id);
		if (!user) {
			throw new BadRequestException("用户不存在");
		}

		if (dto.username && dto.username !== user.username) {
			const exists = await this.userRepository.findOne({
				where: { username: dto.username },
			});
			if (exists && exists.id !== id) {
				throw new BadRequestException("用户名已存在");
			}
		}

		if (dto.email && dto.email !== user.email) {
			const exists = await this.userRepository.findOne({
				where: { email: dto.email },
			});
			if (exists && exists.id !== id) {
				throw new BadRequestException("邮箱已存在");
			}
		}

		if (dto.password) {
			dto.password = await bcrypt.hash(dto.password, 10);
		}

		Object.assign(user, dto);
		try {
			return this.userRepository.save(user);
		} catch (error) {
			throw new BadRequestException();
		}
	}

	async remove(id: string) {
		const result = await this.userRepository.delete(id);
		if (result.affected === 0) {
			throw new BadRequestException("用户不存在");
		}
		return result;
	}
}
