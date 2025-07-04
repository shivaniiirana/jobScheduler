// import { Injectable, Logger } from '@nestjs/common';
// import { Cron } from '@nestjs/schedule';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, LessThanOrEqual } from 'typeorm';
// import { Job } from '../entities/job.entity';
// import { JobRunnerService } from './jobRunner.service';
// import { MAX_RETRIES, RETRY_DELAY } from 'src/constants/jobScheduler.constants';

// @Injectable()
// export class SchedulerService {
//   private readonly logger = new Logger(SchedulerService.name);

//   constructor(
//     @InjectRepository(Job)
//     private readonly jobRepo: Repository<Job>,
//     private readonly runner: JobRunnerService,
//   ) {}

//   @Cron('*/10 * * * * *')
//   async processJobs() {
//     const now = new Date();

//     const jobs = await this.jobRepo.find({
//       where: [
//         {
//           status: 'pending',
//           scheduledTime: LessThanOrEqual(now),
//           isLocked: false,
//         },
//         {
//           status: 'running',
//           nextRetryTime: LessThanOrEqual(now),
//           isLocked: false,
//         },
//       ],
//     });

//     for (const job of jobs) {
//       try {
//         // Atomically try to lock the job (only if not already locked)
//         const result = await this.jobRepo.update(
//           { id: job.id, isLocked: false },
//           { isLocked: true },
//         );

//         if (result.affected === 0) {
//           this.logger.warn(`Job ${job.id} is already locked`);
//           continue;
//         }

//         this.logger.log(`Lock acquired for Job ${job.id}`);
//         await this.executeJob(job);

//         await this.jobRepo.update(job.id, { isLocked: false });
//         this.logger.log(`Lock released for Job ${job.id}`);
//       } catch (err) {
//         this.logger.error(`Failed to process Job ${job.id}`, err.stack);

//         // Always unlock on error
//         await this.jobRepo.update(job.id, { isLocked: false });
//       }
//     }
//   }

//   private async executeJob(job: Job) {
//     try {
//       await this.jobRepo.update(job.id, {
//         status: 'running',
//         nextRetryTime: null as unknown as Date,
//       });

//       await this.runner.run(job.type, job.metadata);

//       const now = new Date();

//       if (job.recurring) {
//         const nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
//         await this.jobRepo.update(job.id, {
//           scheduledTime: nextRun,
//           lastExecutedAt: now,
//           retryCount: 0,
//           status: 'pending',
//         });
//       } else {
//         await this.jobRepo.update(job.id, {
//           status: 'completed',
//           lastExecutedAt: now,
//         });
//       }

//       this.logger.log(`Job ${job.id} executed successfully`);
//     } catch (error) {
//       const retryCount = job.retryCount + 1;
//       const hasFailed = retryCount >= MAX_RETRIES;

//       await this.jobRepo.update(job.id, {
//         retryCount,
//         status: hasFailed ? 'failed' : 'running',
//         nextRetryTime: hasFailed
//           ? (null as unknown as Date)
//           : new Date(Date.now() + RETRY_DELAY),
//       });

//       this.logger.error(
//         `Job ${job.id} failed (${retryCount}/${MAX_RETRIES})`,
//         error.stack,
//       );
//     }
//   }
// }

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
