import { IsString, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({
    description: 'Type of job to execute (e.g., "email", "report_generation")',
    example: 'email',
  })
  @IsString()
  type: string;

  @ApiPropertyOptional({
    description:
      'Optional metadata passed to the job. Dynamic key-value pairs.',
    example: {
      userId: '12345',
      subject: 'Welcome!',
      body: 'Hello, user!',
    },
    type: 'object',
    additionalProperties: true, // Allows any additional properties
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Scheduled time for the job execution (ISO string).',
    example: '2025-07-01T14:30:00.000Z',
    type: String,
    format: 'date-time',
  })
  @Type(() => Date)
  @IsDate()
  scheduledTime: Date;

  @ApiPropertyOptional({
    description: 'Whether the job should repeat daily.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  recurring?: boolean;
}
