import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { SurveyController } from './survey.controller';
import { SurveyService } from './survey.service';
import { Survey } from './entities/survey.entity';
import { SurveyResponse } from './entities/survey-response.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Survey, SurveyResponse]), AuthModule],
  controllers: [SurveyController],
  providers: [SurveyService],
})
export class SurveyModule {}
