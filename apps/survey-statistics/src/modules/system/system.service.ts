import { Injectable, HttpStatus, Logger } from "@nestjs/common";
import { CreateSystemDto } from "./dto/create-system.dto";
import { UpdateSystemDto } from "./dto/update-system.dto";
import { System } from "./entities/system.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryBuilderFactory, QueryBuilderHelper } from "@base/commons";
import { SystemConfigType } from "@/enums/system";
import { UserService } from "../user/user.service";

@Injectable()
export class SystemService {
	private systemQueryBuilder: QueryBuilderHelper<System>;
	constructor(
		@InjectRepository(System)
		private readonly systemRepository: Repository<System>,
		private readonly queryBuilderFactory: QueryBuilderFactory,
		private readonly userService: UserService,
		private readonly logger: Logger
	) {
		this.systemQueryBuilder = this.queryBuilderFactory.createFromRepository(
			this.systemRepository
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
			return {
				code: HttpStatus.INTERNAL_SERVER_ERROR,
				message: "系统已初始化",
			};
		}

		// 2. 初始化系统
		return await this.systemRepository.manager.transaction(async (manager) => {
			// 1. 创建超级管理员
			const superAdmins = await this.userService.createSuperAdmin();

			// 2. 如果需要在此事务中进行其他数据库操作，可以使用 manager
			// 例如：创建系统配置
			// const systemConfig = manager.create(System, { key: SystemConfigType.IS_INITIALIZED, value: 'true' });
			// await manager.save(systemConfig);

			return superAdmins;
		});
	}

	update(id: number, updateSystemDto: UpdateSystemDto) {
		return `This action updates a #${id} system`;
	}
}
