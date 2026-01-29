"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const bcrypt = require("bcrypt");
const user_entity_1 = require("./entities/user.entity");
let UserService = class UserService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async create(dto) {
        const exists = await this.userRepository.findOne({
            where: [{ username: dto.username }, { email: dto.email }],
        });
        if (exists) {
            throw new common_1.ConflictException("用户名或邮箱已存在");
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
    async update(id, dto) {
        const user = await this.findById(id);
        if (!user) {
            throw new common_1.NotFoundException("用户不存在");
        }
        if (dto.username && dto.username !== user.username) {
            const exists = await this.userRepository.findOne({
                where: { username: dto.username },
            });
            if (exists && exists.id !== id) {
                throw new common_1.ConflictException("用户名已存在");
            }
        }
        if (dto.email && dto.email !== user.email) {
            const exists = await this.userRepository.findOne({
                where: { email: dto.email },
            });
            if (exists && exists.id !== id) {
                throw new common_1.ConflictException("邮箱已存在");
            }
        }
        if (dto.password) {
            dto.password = await bcrypt.hash(dto.password, 10);
        }
        Object.assign(user, dto);
        try {
            return this.userRepository.save(user);
        }
        catch (error) {
            throw new common_1.InternalServerErrorException();
        }
    }
    async remove(id) {
        const result = await this.userRepository.delete(id);
        if (result.affected === 0) {
            throw new common_1.NotFoundException("用户不存在");
        }
        return result;
    }
    findByUsername(username) {
        return this.userRepository.findOne({
            where: { username },
        });
    }
    findByEmail(email) {
        return this.userRepository.findOne({
            where: { email },
        });
    }
    findById(id) {
        return this.userRepository.findOne({
            where: { id },
        });
    }
};
UserService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UserService);
exports.UserService = UserService;
