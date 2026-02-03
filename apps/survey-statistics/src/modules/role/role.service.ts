import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { Role } from "./role.entity";

@Injectable()
export class RoleService {
	constructor(private readonly roleRepository: Repository<Role>) {}

	async findAll() {
		return this.roleRepository.find();
	}
}
