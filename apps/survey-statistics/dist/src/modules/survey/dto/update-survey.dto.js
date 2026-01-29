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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSurveyDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const create_survey_dto_1 = require("./create-survey.dto");
class UpdateSurveyDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, swagger_1.ApiPropertyOptional)({ description: '问卷标题' }),
    __metadata("design:type", String)
], UpdateSurveyDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, swagger_1.ApiPropertyOptional)({ description: '问卷描述' }),
    __metadata("design:type", String)
], UpdateSurveyDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => create_survey_dto_1.SurveyQuestionDto),
    (0, class_validator_1.ArrayMinSize)(1),
    (0, class_validator_1.IsOptional)(),
    (0, swagger_1.ApiPropertyOptional)({ type: [create_survey_dto_1.SurveyQuestionDto], description: '问题列表' }),
    __metadata("design:type", Array)
], UpdateSurveyDto.prototype, "questions", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, swagger_1.ApiPropertyOptional)({ description: '问卷状态' }),
    __metadata("design:type", String)
], UpdateSurveyDto.prototype, "status", void 0);
exports.UpdateSurveyDto = UpdateSurveyDto;
