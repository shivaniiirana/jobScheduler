import { Controller } from '@nestjs/common';
import { RedisLockService } from './redis.service';

@Controller('redis')
export class RedisController {
  constructor(private readonly redisService: RedisLockService) {}
}
