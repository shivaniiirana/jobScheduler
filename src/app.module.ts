import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { Job } from './entities/job.entity';
import { JobModule } from './job/job.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres', 
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'shivani',
      database: 'jobScheduler2',
      entities: [Job],
      synchronize: true,
    }),
    RedisModule,
    JobModule,
    SchedulerModule,
  ],
})
export class AppModule {}
