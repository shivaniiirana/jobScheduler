import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchedulerService } from './scheduler.service';
import { JobRunnerService } from './jobRunner.service';
import { Job } from 'src/entities/job.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job]),
    RedisModule, 
  ],
  providers: [SchedulerService, JobRunnerService],
})
export class SchedulerModule {}
