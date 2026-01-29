import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { Survey } from './entities/survey.entity';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { SurveyResponse } from './entities/survey-response.entity';
import { SubmitSurveyResponseDto } from './dto/submit-response.dto';

@Injectable()
export class SurveyService {
  constructor(
    @InjectRepository(Survey)
    private readonly surveyRepository: Repository<Survey>,
    @InjectRepository(SurveyResponse)
    private readonly responseRepository: Repository<SurveyResponse>,
  ) {}

  create(ownerId: string, dto: CreateSurveyDto) {
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

  async findById(id: string) {
    const survey = await this.surveyRepository.findOne({ where: { id } });
    if (!survey) {
      throw new NotFoundException('问卷不存在');
    }
    return survey;
  }

  async update(id: string, ownerId: string, dto: UpdateSurveyDto) {
    const survey = await this.findById(id);
    if (survey.ownerId !== ownerId) {
      throw new ForbiddenException('无权修改该问卷');
    }
    Object.assign(survey, dto);
    return this.surveyRepository.save(survey);
  }

  async remove(id: string, ownerId: string) {
    const survey = await this.findById(id);
    if (survey.ownerId !== ownerId) {
      throw new ForbiddenException('无权删除该问卷');
    }
    await this.surveyRepository.delete({ id });
    return { deleted: true };
  }

  async submitResponse(
    userId: string,
    surveyId: string,
    dto: SubmitSurveyResponseDto,
  ) {
    const survey = await this.findById(surveyId);
    const response = this.responseRepository.create({
      surveyId: survey.id,
      userId,
      answers: dto.answers,
      metadata: dto.metadata,
    });
    return this.responseRepository.save(response);
  }

  async getStatistics(surveyId: string) {
    await this.findById(surveyId);
    const responses = await this.responseRepository.find({
      where: { surveyId },
    });
    const summary: Record<string, Record<string, number>> = {};
    responses.forEach((response) => {
      Object.entries(response.answers).forEach(([questionId, answer]) => {
        const normalized =
          typeof answer === 'string' ? answer : JSON.stringify(answer);
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
}
