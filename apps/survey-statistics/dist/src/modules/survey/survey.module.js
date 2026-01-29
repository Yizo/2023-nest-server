"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SurveyModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const auth_module_1 = require("../auth/auth.module");
const survey_controller_1 = require("./survey.controller");
const survey_service_1 = require("./survey.service");
const survey_entity_1 = require("./entities/survey.entity");
const survey_response_entity_1 = require("./entities/survey-response.entity");
let SurveyModule = class SurveyModule {
};
SurveyModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([survey_entity_1.Survey, survey_response_entity_1.SurveyResponse]), auth_module_1.AuthModule],
        controllers: [survey_controller_1.SurveyController],
        providers: [survey_service_1.SurveyService],
    })
], SurveyModule);
exports.SurveyModule = SurveyModule;
