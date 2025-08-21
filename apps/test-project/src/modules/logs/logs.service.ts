import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logs } from './logs.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(Logs)
    private readonly logsRepository: Repository<Logs>,
  ) {}

  async create(logData: Partial<Logs>): Promise<Logs> {
    const log = this.logsRepository.create(logData);
    return await this.logsRepository.save(log);
  }

  async findAll(): Promise<Logs[]> {
    return await this.logsRepository.find({
      relations: ['user'],
    });
  }

  async findOne(id: number): Promise<Logs | null> {
    return await this.logsRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async remove(id: number): Promise<void> {
    await this.logsRepository.delete(id);
  }
}
