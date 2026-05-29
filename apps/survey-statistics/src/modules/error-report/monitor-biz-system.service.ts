import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { Repository } from "typeorm";
import { paginateBuilder } from "@base/commons";
import { CreateMonitorBizSystemDto } from "./dto/create-monitor-biz-system.dto";
import { ListMonitorBizSystemDto } from "./dto/list-monitor-biz-system.dto";
import { UpdateMonitorBizSystemDto } from "./dto/update-monitor-biz-system.dto";
import { ClientError } from "./entities/client-error.entity";
import { MonitorBizSystem } from "./entities/monitor-biz-system.entity";

@Injectable()
export class MonitorBizSystemService {
	constructor(
		@InjectRepository(MonitorBizSystem)
		private readonly monitorBizSystemRepository: Repository<MonitorBizSystem>,
		@InjectRepository(ClientError)
		private readonly clientErrorRepository: Repository<ClientError>,
	) {}

	/** 已启用业务系统（下拉等场景，含后端生成的 appId） */
	async listEnabled() {
		return this.monitorBizSystemRepository.find({
			where: { enabled: true },
			order: { appId: "ASC" },
			select: ["id", "appId", "name", "enabled", "createdAt", "updatedAt"],
		});
	}

	/** 分页查询（管理端） */
	async findAll(query: ListMonitorBizSystemDto) {
		const { page, pageSize, appId, name, enabled } = query;
		const qb = this.monitorBizSystemRepository
			.createQueryBuilder("s")
			.orderBy("s.updatedAt", "DESC");

		if (appId) {
			qb.andWhere("s.appId LIKE :appId", { appId: `%${appId}%` });
		}
		if (name) {
			qb.andWhere("s.name LIKE :name", { name: `%${name}%` });
		}
		if (enabled !== undefined) {
			qb.andWhere("s.enabled = :enabled", { enabled });
		}

		return paginateBuilder(qb, { page, pageSize });
	}

	async findOne(id: number) {
		const system = await this.monitorBizSystemRepository.findOne({ where: { id } });
		if (!system) {
			throw new NotFoundException("业务系统不存在");
		}
		return system;
	}

	async create(dto: CreateMonitorBizSystemDto) {
		const system = this.monitorBizSystemRepository.create({
			// appId 列有唯一约束兜底，UUID 碰撞概率可忽略，无需额外查重
			appId: randomUUID().replace(/-/g, ""),
			name: dto.name,
			enabled: dto.enabled ?? true,
		});
		return this.monitorBizSystemRepository.save(system);
	}

	async update(dto: UpdateMonitorBizSystemDto) {
		const system = await this.findOne(dto.id);

		if (dto.name !== undefined) {
			system.name = dto.name;
		}
		if (dto.enabled !== undefined) {
			system.enabled = dto.enabled;
		}

		return this.monitorBizSystemRepository.save(system);
	}

	async remove(id: number) {
		await this.findOne(id);

		const logCount = await this.clientErrorRepository.count({
			where: { systemId: id },
		});
		if (logCount > 0) {
			throw new BadRequestException("该业务系统下存在监控日志，无法删除");
		}

		await this.monitorBizSystemRepository.delete(id);
		return true;
	}

	async findEnabledByAppId(appId: string) {
		return this.monitorBizSystemRepository.findOne({
			where: { appId, enabled: true },
		});
	}

	async findEnabledById(id: number) {
		const system = await this.monitorBizSystemRepository.findOne({
			where: { id, enabled: true },
		});
		return system ?? null;
	}
}
