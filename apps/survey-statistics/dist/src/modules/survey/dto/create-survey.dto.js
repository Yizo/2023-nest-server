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
exports.CreateSurveyDto = exports.SurveyQuestionDto = void 0;
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
class SurveyQuestionDto {
}
__decorate([
    (0, swagger_1.ApiProperty)({ description: "问题 ID" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SurveyQuestionDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "问题文本" }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SurveyQuestionDto.prototype, "text", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: "问题类型", enum: ["single", "multiple", "text"] }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], SurveyQuestionDto.prototype, "type", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: "可选项" }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Array)
], SurveyQuestionDto.prototype, "options", void 0);
exports.SurveyQuestionDto = SurveyQuestionDto;
class CreateSurveyDto {
}
__decorate([
    (0, swagger_1.ApiProperty)({ description: "问卷标题" }),
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSurveyDto.prototype, "title", void 0);
__decorate([
    (0, swagger_1.ApiPropertyOptional)({ description: "问卷描述" }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CreateSurveyDto.prototype, "description", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [SurveyQuestionDto], description: "问题列表" }),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => SurveyQuestionDto),
    (0, class_validator_1.ArrayMinSize)(1),
    __metadata("design:type", Array)
], CreateSurveyDto.prototype, "questions", void 0);
exports.CreateSurveyDto = CreateSurveyDto;
