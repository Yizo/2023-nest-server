import {
	Injectable,
	ConflictException,
	NotFoundException,
	InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import * as bcrypt from "bcrypt";
import { User } from "./entities/user.entity";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UserService {
	constructor(
		@InjectRepository(User)
		private readonly userRepository: Repository<User>,
	) {}

	async create(dto: CreateUserDto): Promise<User> {
		const exists = await this.userRepository.findOne({
			where: [{ username: dto.username }, { email: dto.email }],
		});
		if (exists) {
			throw new ConflictException("用户名或邮箱已存在");
		}

		const hashed = await bcrypt.hash(dto.password, 10);
		const user = this.userRepository.create({
			...dto,
			password: hashed,
		});
		return this.userRepository.save(user);
	}

	async list(page = 1, pageSize = 10) {
		const take = Math.max(1, pageSize);
		const skip = Math.max(0, (page - 1) * take);
		const [data, total] = await this.userRepository.findAndCount({
			take,
			skip,
			order: {
				createdAt: "DESC",
			},
		});
		return { data, total };
	}

	async update(id: string, dto: UpdateUserDto) {
		const user = await this.findById(id);
		if (!user) {
			throw new NotFoundException("用户不存在");
		}

		if (dto.username && dto.username !== user.username) {
			const exists = await this.userRepository.findOne({
				where: { username: dto.username },
			});
			if (exists && exists.id !== id) {
				throw new ConflictException("用户名已存在");
			}
		}

		if (dto.email && dto.email !== user.email) {
			const exists = await this.userRepository.findOne({
				where: { email: dto.email },
			});
			if (exists && exists.id !== id) {
				throw new ConflictException("邮箱已存在");
			}
		}

		if (dto.password) {
			dto.password = await bcrypt.hash(dto.password, 10);
		}

		Object.assign(user, dto);
		try {
			return this.userRepository.save(user);
		} catch (error) {
			throw new InternalServerErrorException();
		}
	}

	async remove(id: string) {
		const result = await this.userRepository.delete(id);
		if (result.affected === 0) {
			throw new NotFoundException("用户不存在");
		}
		return result;
	}

	findByUsername(username: string) {
		return this.userRepository.findOne({
			where: { username },
		});
	}

	findByEmail(email: string) {
		return this.userRepository.findOne({
			where: { email },
		});
	}

	findById(id: string) {
		return this.userRepository.findOne({
			where: { id },
		});
	}
}
