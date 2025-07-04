import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JobService } from './job.service';
import { CreateJobDto } from './dtos/createJob.dto';

@ApiTags('Jobs') 
@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post('createJob')
  @ApiOperation({
    summary: 'Create a new job',
    description:
      'Creates a job with scheduling, metadata and optional recurrence.',
  })
  @ApiBody({
    type: CreateJobDto,
    examples: {
      example1: {
        summary: 'Email Job',
        value: {
          type: 'sendEmail',
          metadata: {
            to: 'user@example.com',
            subject: 'Welcome!',
            body: 'Thanks for signing up.',
          },
          scheduledTime: '2025-07-01T18:55:00.000Z',
          recurring: false,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: 'The job was created and scheduled successfully.',
  })
  async createJob(@Body() dto: CreateJobDto) {
    return this.jobService.createJobService(
      dto.type,
      dto.metadata || {},
      dto.scheduledTime,
      dto.recurring ?? false,
    );
  }
}
