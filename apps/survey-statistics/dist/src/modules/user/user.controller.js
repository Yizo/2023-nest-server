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
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const user_service_1 = require("./user.service");
const create_user_dto_1 = require("./dto/create-user.dto");
const update_user_dto_1 = require("./dto/update-user.dto");
let UserController = class UserController {
    constructor(userService) {
        this.userService = userService;
    }
    create(dto) {
        return this.userService.create(dto);
    }
    async list(page = "1", pageSize = "10") {
        const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
        const pageSizeNum = Math.max(1, Number.parseInt(pageSize, 10) || 10);
        const { data, total } = await this.userService.list(pageNum, pageSizeNum);
        return {
            data,
            total,
            page: pageNum,
            pageSize: pageSizeNum,
        };
    }
    async detail(id) {
        const user = await this.userService.findById(id);
        if (!user) {
            throw new common_1.NotFoundException("用户不存在");
        }
        const { password, ...rest } = user;
        return rest;
    }
    update(id, dto) {
        return this.userService.update(id, dto);
    }
    remove(id) {
        return this.userService.remove(id);
    }
};
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: "创建用户" }),
    (0, swagger_1.ApiCreatedResponse)({ description: "用户创建成功" }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: "分页查询用户" }),
    (0, swagger_1.ApiQuery)({ name: "page", required: false }),
    (0, swagger_1.ApiQuery)({ name: "pageSize", required: false }),
    (0, swagger_1.ApiOkResponse)({ description: "返回分页结果列表" }),
    __param(0, (0, common_1.Query)("page")),
    __param(1, (0, common_1.Query)("pageSize")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "查询单个用户" }),
    (0, swagger_1.ApiOkResponse)({ description: "返回用户详情" }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "detail", null);
__decorate([
    (0, common_1.Put)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "修改用户信息" }),
    (0, swagger_1.ApiOkResponse)({ description: "用户更新完成" }),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_user_dto_1.UpdateUserDto]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(":id"),
    (0, common_1.HttpCode)(204),
    (0, swagger_1.ApiOperation)({ summary: "删除用户" }),
    (0, swagger_1.ApiNoContentResponse)({ description: "用户已删除" }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], UserController.prototype, "remove", null);
UserController = __decorate([
    (0, common_1.Controller)("users"),
    (0, swagger_1.ApiTags)("users"),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [user_service_1.UserService])
], UserController);
exports.UserController = UserController;
