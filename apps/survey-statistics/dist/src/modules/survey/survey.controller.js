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
exports.SurveyController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_guard_1 = require("../auth/jwt/jwt.guard");
const req_user_decorator_1 = require("../../common/decorators/req-user.decorator");
const survey_service_1 = require("./survey.service");
const create_survey_dto_1 = require("./dto/create-survey.dto");
const update_survey_dto_1 = require("./dto/update-survey.dto");
const submit_response_dto_1 = require("./dto/submit-response.dto");
let SurveyController = class SurveyController {
    constructor(surveyService) {
        this.surveyService = surveyService;
    }
    create(user, dto) {
        return this.surveyService.create(user.userId, dto);
    }
    update(user, id, dto) {
        return this.surveyService.update(id, user.userId, dto);
    }
    remove(user, id) {
        return this.surveyService.remove(id, user.userId);
    }
    list(limit = 20, offset = 0) {
        return this.surveyService.findAll(Number(limit), Number(offset));
    }
    detail(id) {
        return this.surveyService.findById(id);
    }
    respond(user, id, dto) {
        return this.surveyService.submitResponse(user.userId, id, dto);
    }
    stats(id) {
        return this.surveyService.getStatistics(id);
    }
};
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: "创建问卷" }),
    (0, swagger_1.ApiBody)({ type: create_survey_dto_1.CreateSurveyDto }),
    (0, swagger_1.ApiCreatedResponse)({ description: "问卷创建成功" }),
    __param(0, (0, req_user_decorator_1.ReqUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, create_survey_dto_1.CreateSurveyDto]),
    __metadata("design:returntype", void 0)
], SurveyController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Patch)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "更新问卷" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "问卷 ID" }),
    (0, swagger_1.ApiBody)({ type: update_survey_dto_1.UpdateSurveyDto }),
    __param(0, (0, req_user_decorator_1.ReqUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, update_survey_dto_1.UpdateSurveyDto]),
    __metadata("design:returntype", void 0)
], SurveyController.prototype, "update", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Delete)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "删除问卷" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "问卷 ID" }),
    __param(0, (0, req_user_decorator_1.ReqUser)()),
    __param(1, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], SurveyController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: "分页查询问卷" }),
    (0, swagger_1.ApiQuery)({ name: "limit", required: false, description: "每页数量，默认 20" }),
    (0, swagger_1.ApiQuery)({ name: "offset", required: false, description: "偏移量，默认 0" }),
    __param(0, (0, common_1.Query)("limit")),
    __param(1, (0, common_1.Query)("offset")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], SurveyController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(":id"),
    (0, swagger_1.ApiOperation)({ summary: "查询问卷详情" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "问卷 ID" }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SurveyController.prototype, "detail", null);
__decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Post)(":id/responses"),
    (0, swagger_1.ApiOperation)({ summary: "提交问卷" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "问卷 ID" }),
    (0, swagger_1.ApiBody)({ type: submit_response_dto_1.SubmitSurveyResponseDto }),
    __param(0, (0, req_user_decorator_1.ReqUser)()),
    __param(1, (0, common_1.Param)("id")),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, submit_response_dto_1.SubmitSurveyResponseDto]),
    __metadata("design:returntype", void 0)
], SurveyController.prototype, "respond", null);
__decorate([
    (0, common_1.Get)(":id/results"),
    (0, swagger_1.ApiOperation)({ summary: "查询问卷统计结果" }),
    (0, swagger_1.ApiParam)({ name: "id", description: "问卷 ID" }),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SurveyController.prototype, "stats", null);
SurveyController = __decorate([
    (0, common_1.Controller)("surveys"),
    (0, swagger_1.ApiTags)("surveys"),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [survey_service_1.SurveyService])
], SurveyController);
exports.SurveyController = SurveyController;
