import { Injectable, Logger, NotFoundException } from '@nestjs/common';

type JobMetadata = Record<string, any>;
type JobHandlerFunction = (metadata: JobMetadata) => Promise<void>;

@Injectable()
export class JobRunnerService {
  private readonly logger = new Logger(JobRunnerService.name);

  //map of job handlers
  private readonly jobHandlers: Map<string, JobHandlerFunction>;

  constructor() {
    // Initialize the job handlers map with specific job types and their corresponding handler functions
    this.jobHandlers = new Map<string, JobHandlerFunction>([
      ['sendEmail', this.sendEmail.bind(this)],
      ['generateReport', this.generateReport.bind(this)],
      ['syncUsers', this.syncUsers.bind(this)],
      // We can add more jobs here according to the requirements
    ]);
  }

  async run(type: string, metadata: JobMetadata) {
    const handler = this.jobHandlers.get(type);

    if (!handler) {
      throw new NotFoundException('no service register for this job');
    }

    this.logger.log(`Running job of type: ${type}`);
    await handler(metadata);
  }

  private async sendEmail({ to, subject, body }: any) {
    console.log('sending email');
    // throw new Error('Email service not implemented');
    this.logger.log(`Sending email to ${to} | Subject: ${subject}`);
  }

  private async generateReport({ reportType }: any) {
    this.logger.log('generating report of type');
  }

  private async syncUsers({ source }: any) {
    this.logger.log('Syncing users');
  }
}
