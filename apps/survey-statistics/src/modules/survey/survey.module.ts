import { Module } from "@nestjs/common";
import { SurveyController } from "./survey.controller";
import { SurveyQueries } from "./survey.queries";
import { SurveyService } from "./survey.service";

@Module({ controllers: [SurveyController], providers: [SurveyService, SurveyQueries], exports: [SurveyService] })
export class SurveyModule {}
