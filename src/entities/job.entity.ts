import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

export type JobStatus = 'pending' | 'running' | 'failed' | 'completed';

@Entity()
export class Job {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  type: string;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @Column({ type: 'timestamp' })
  scheduledTime: Date;

  @Column({ default: false })
  recurring: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastExecutedAt: Date;

  @Column({ default: 'pending' })
  status: JobStatus;

  @Column({ default: 0 })
  retryCount: number;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryTime: Date;

  @Column({ type: 'int', nullable: true }) // store in milliseconds (e.g. 86400000 for 24hr)
  recurringInterval: number;
}
