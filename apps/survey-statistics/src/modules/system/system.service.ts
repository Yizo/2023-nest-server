import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { CreateSystemDto } from "./dto/create-system.dto";
import { UpdateSystemDto } from "./dto/update-system.dto";
import { System } from "./entities/system.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryBuilderFactory, QueryBuilderHelper } from "@base/commons";
import { SystemConfigType } from "@/enums/system";
import { UserService } from "../user/user.service";
import { RoleService } from "../role/role.service";

@Injectable()
export class SystemService {
	private systemQueryBuilder: QueryBuilderHelper<System>;
	constructor(
		@InjectRepository(System)
		private readonly systemRepository: Repository<System>,
		private readonly queryBuilderFactory: QueryBuilderFactory,
		private readonly userService: UserService,
		private readonly roleService: RoleService,
		private readonly logger: Logger,
	) {
		this.systemQueryBuilder = this.queryBuilderFactory.createFromRepository(
			this.systemRepository,
		);
	}

	// 查询是否已初始化
	async isInitialized() {
		const system = await this.systemRepository.findOne({
			where: {
				key: SystemConfigType.IS_INITIALIZED,
			},
		});
		return system ? true : false;
	}

	// 系统初始化
	async create(createSystemDto: CreateSystemDto) {
		// 1. 检查是否已初始化
		const isInitialized = await this.isInitialized();
		if (isInitialized) {
			throw new BadRequestException("系统已初始化");
		}

		// 2. 初始化系统
		return await this.systemRepository.manager.transaction(async (manager) => {
			// 1. 创建系统角色
			const createRolesResult = await this.roleService.createSystemRoles();
			if (!createRolesResult) return true;
			// 2. 创建超级管理员
			const createAdminResult = await this.userService.createSuperAdmin();
			if (!createAdminResult) return true;
			// 3. 设置系统初始化状态
			await manager
				.createQueryBuilder()
				.insert()
				.into(System)
				.values([
					{
						key: SystemConfigType.IS_INITIALIZED,
						value: true as any,
					},
				])
				.execute();
			return true;
		});
	}

	update(id: number, updateSystemDto: UpdateSystemDto) {
		return `This action updates a #${id} system`;
	}
}
