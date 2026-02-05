import { Injectable, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, QueryBuilder } from "typeorm";
import { Role } from "./role.entity";
import { RoleType } from "@/enums/role";
import { QueryBuilderFactory, QueryBuilderHelper } from "@base/commons";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";

@Injectable()
export class RoleService {
	private roleQueryBuilder: QueryBuilderHelper<Role>;
	private roleBuilder: QueryBuilder<Role>;
	constructor(
		@InjectRepository(Role)
		private readonly roleRepository: Repository<Role>,
		private readonly queryBuilderFactory: QueryBuilderFactory,
	) {
		this.roleQueryBuilder = this.queryBuilderFactory.createFromRepository(this.roleRepository);
		this.roleBuilder = this.roleRepository.createQueryBuilder("role");
	}

	async findAll(page: number, pageSize: number) {
		return await this.roleQueryBuilder.findPaginated(
			{
				orderBy: [{ field: "updatedAt", direction: "DESC" }],
			},
			page,
			pageSize,
		);
	}

	// 系统初始化角色
	async createSystemRoles() {
		const count = await this.roleRepository.count();
		if (count > 0) {
			return false;
		}

		const roles = Object.keys(RoleType).map((key) => {
			return {
				name: key,
				code: RoleType[key],
			};
		});

		await this.roleBuilder.insert().into(Role).values(roles).execute();

		return true;
	}

	async create(createRoleDto: CreateRoleDto) {
		// 检查角色是否存在
		const role = await this.roleRepository.findOne({ where: { code: createRoleDto.code } });
		if (role) {
			throw new BadRequestException("角色已存在");
		}

		await this.roleBuilder.insert().into(Role).values(createRoleDto).execute();
	}

	async update(updateRoleDto: UpdateRoleDto) {
		const { id } = updateRoleDto;
		const role = await this.roleRepository.findOne({ where: { id } });
		if (!role) {
			throw new BadRequestException("角色不存在");
		}
		await this.roleBuilder.update().set(updateRoleDto).where("id = :id", { id }).execute();
	}

	async remove(id: number) {
		const role = await this.roleRepository.findOne({ where: { id } });
		if (!role) {
			throw new BadRequestException("角色不存在");
		}
		await this.roleBuilder.delete().where("id = :id", { id }).execute();
	}
}
