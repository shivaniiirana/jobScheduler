import { Module } from '@nestjs/common';
import { RedisLockService } from './redis.service';

@Module({
  providers: [RedisLockService],
  exports: [RedisLockService],
})
export class RedisModule {}
