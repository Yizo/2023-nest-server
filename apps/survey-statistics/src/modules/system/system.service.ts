import { Injectable, HttpStatus } from "@nestjs/common";
import { CreateSystemDto } from "./dto/create-system.dto";
import { UpdateSystemDto } from "./dto/update-system.dto";
import { System } from "./entities/system.entity";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { QueryBuilderFactory, QueryBuilderHelper } from "@2023-nest-server/commons";
import { SystemConfigType } from "@/enums/system";

@Injectable()
export class SystemService {
	private systemQueryBuilder: QueryBuilderHelper<System>;
	constructor(
		@InjectRepository(System)
		private readonly systemRepository: Repository<System>,
		private readonly queryBuilderFactory: QueryBuilderFactory
	) {
		this.systemQueryBuilder = this.queryBuilderFactory.createFromRepository(
			this.systemRepository
		);
	}

	// 查询是否已初始化
	async isInitialized() {
		const system = await this.systemQueryBuilder.findOne({
			conditions: [{ field: "key", operator: "eq", value: SystemConfigType.IS_INITIALIZED }],
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
		// this.systemRepository.manager.transaction(async (manager) => {
		// 	const system = manager.create(System, createSystemDto);
		// 	return await manager.save(system);
		// });
		return "ok";
	}

	update(id: number, updateSystemDto: UpdateSystemDto) {
		return `This action updates a #${id} system`;
	}
}
