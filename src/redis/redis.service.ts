import { Injectable, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import Redlock, { Lock } from 'redlock'; 

@Injectable()
export class RedisLockService implements OnModuleInit {
  private client: Redis;
  private redlock: Redlock;

  onModuleInit() {
    this.client = new Redis(); 
    this.redlock = new Redlock([this.client], {
      retryCount: 3,
      retryDelay: 200,
      retryJitter: 200,
    });
  }

  async acquireLock(resource: string, ttl: number): Promise<Lock> {

    return this.redlock.acquire([resource], ttl);
  }

  async releaseLock(lock: Lock): Promise<void> {
    
    await lock.release();
  }
}
