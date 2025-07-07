import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../entities/job.entity';

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
  ) {}
  //creating a job
  async createJobService(
    type: string,
    metadata: Record<string, any>,
    scheduledTime: Date,
    recurring = false,
    recurringInterval?: number,
  ) {
    const job = this.jobRepo.create({
      type,
      metadata,
      scheduledTime,
      recurring,
      recurringInterval,
    });

    return this.jobRepo.save(job);
  }
}
