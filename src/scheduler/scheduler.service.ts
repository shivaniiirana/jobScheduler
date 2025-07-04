import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Job } from '../entities/job.entity';
import { JobRunnerService } from './jobRunner.service';
import {
  MAX_RETRIES,
  NEXT_RECURRING,
  RETRY_DELAY,
} from 'src/constants/jobScheduler.constants';
import { RedisLockService } from 'src/redis/redis.service';
import { Lock } from 'redlock';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectRepository(Job)
    private readonly jobRepo: Repository<Job>,
    private readonly jobRunner: JobRunnerService,
    private readonly redisLock: RedisLockService,
  ) {}

  //runs every 10 seconds
  @Cron('*/10 * * * * *')
  async processJobs() {
    const now = new Date();

    // Get all jobs that are ready to run
    const jobs = await this.jobRepo.find({
      where: [
        {
          status: 'pending',
          scheduledTime: LessThanOrEqual(now),
        },
        {
          status: 'running',
          nextRetryTime: LessThanOrEqual(now),
        },
      ],
    });

    for (const job of jobs) {
      const lockKey = `locks:job:${job.id}`; // Unique lock key for Redis
      let lock: Lock | undefined;

      try {
        // Acquiring Redis lock
        lock = await this.redisLock.acquireLock(lockKey, 30000);
        this.logger.log(`Lock acquired for Job ${job.id}`);

        // Executing the job
        await this.executeJob(job);
      } catch (err) {
        this.logger.warn(`Error in Job ${job.id} - ${err.message}`);
      } finally {
        // Releasing lock
        if (lock) {
          try {
            await this.redisLock.releaseLock(lock);
            this.logger.log(`Lock released for Job ${job.id}`);
          } catch (err) {
            this.logger.error(`Failed to release lock for Job ${job.id}`, err);
          }
        }
      }
    }
  }

  private async executeJob(job: Job) {
    try {
      await this.jobRepo.update(job.id, {
        status: 'running',
        nextRetryTime: null as unknown as Date,
      });
      // running the job using the jobRunner service
      await this.jobRunner.run(job.type, job.metadata);

      const now = new Date();
      // if the job is recurring, scheduling it for the next run
      if (job.recurring) {
        const nextRun = new Date(now.getTime() + NEXT_RECURRING); // 24 hours later
        await this.jobRepo.update(job.id, {
          scheduledTime: nextRun,
          lastExecutedAt: now,
          retryCount: 0,
          status: 'pending',
        });
      } else {
        await this.jobRepo.update(job.id, {
          status: 'completed',
          lastExecutedAt: now,
        });
      }
    } catch (err) {
      const retryCount = job.retryCount + 1;
      const hasFailed = retryCount >= MAX_RETRIES;

      await this.jobRepo.update(job.id, {
        retryCount: retryCount,
        status: hasFailed ? 'failed' : 'running',
        nextRetryTime: hasFailed
          ? (null as unknown as Date)
          : new Date(Date.now() + RETRY_DELAY),
      });

      this.logger.error(
        `Job ${job.id} failed ${retryCount} retry, ${err.message}`,
      );
    }
  }
}
