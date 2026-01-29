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
exports.SurveyService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const survey_entity_1 = require("./entities/survey.entity");
const survey_response_entity_1 = require("./entities/survey-response.entity");
let SurveyService = class SurveyService {
    constructor(surveyRepository, responseRepository) {
        this.surveyRepository = surveyRepository;
        this.responseRepository = responseRepository;
    }
    create(ownerId, dto) {
        const survey = this.surveyRepository.create({
            ...dto,
            ownerId,
            status: 'draft',
        });
        return this.surveyRepository.save(survey);
    }
    findAll(limit = 20, offset = 0) {
        return this.surveyRepository.find({
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
    }
    async findById(id) {
        const survey = await this.surveyRepository.findOne({ where: { id } });
        if (!survey) {
            throw new common_1.NotFoundException('问卷不存在');
        }
        return survey;
    }
    async update(id, ownerId, dto) {
        const survey = await this.findById(id);
        if (survey.ownerId !== ownerId) {
            throw new common_1.ForbiddenException('无权修改该问卷');
        }
        Object.assign(survey, dto);
        return this.surveyRepository.save(survey);
    }
    async remove(id, ownerId) {
        const survey = await this.findById(id);
        if (survey.ownerId !== ownerId) {
            throw new common_1.ForbiddenException('无权删除该问卷');
        }
        await this.surveyRepository.delete({ id });
        return { deleted: true };
    }
    async submitResponse(userId, surveyId, dto) {
        const survey = await this.findById(surveyId);
        const response = this.responseRepository.create({
            surveyId: survey.id,
            userId,
            answers: dto.answers,
            metadata: dto.metadata,
        });
        return this.responseRepository.save(response);
    }
    async getStatistics(surveyId) {
        await this.findById(surveyId);
        const responses = await this.responseRepository.find({
            where: { surveyId },
        });
        const summary = {};
        responses.forEach((response) => {
            Object.entries(response.answers).forEach(([questionId, answer]) => {
                const normalized = typeof answer === 'string' ? answer : JSON.stringify(answer);
                summary[questionId] = summary[questionId] || {};
                summary[questionId][normalized] =
                    (summary[questionId][normalized] || 0) + 1;
            });
        });
        return {
            totalResponses: responses.length,
            answers: summary,
        };
    }
};
SurveyService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(survey_entity_1.Survey)),
    __param(1, (0, typeorm_1.InjectRepository)(survey_response_entity_1.SurveyResponse)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], SurveyService);
exports.SurveyService = SurveyService;
