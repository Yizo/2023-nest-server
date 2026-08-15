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
	async create(_createSystemDto: CreateSystemDto) {
		const isInitialized = await this.isInitialized();
		if (isInitialized) {
			throw new BadRequestException("系统已初始化");
		}

		// 角色/管理员各自有幂等判断；已存在时继续后续步骤，避免半初始化卡死
		await this.roleService.createSystemRoles();
		await this.userService.createSuperAdmin();

		await this.systemRepository.save({
			key: SystemConfigType.IS_INITIALIZED,
			value: true,
		});
		return true;
	}

	update(id: number, updateSystemDto: UpdateSystemDto) {
		return `This action updates a #${id} system`;
	}
}
