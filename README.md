# ⏰ NestJS Job Scheduler with Redis Locking

This project implements a **generic job scheduling system** using **NestJS**, **TypeORM**, **Redis** (for locking), and **Cron Jobs**.

---

## ✅ Features

- Schedule any type of job with dynamic metadata
- Supports recurring jobs (like every 24 hours)
- Redis-based locking to avoid duplicate processing
- Job retry mechanism with exponential backoff
- Clean logging with success/failure status
- Generic design — supports any job type via metadata
- Swagger API for job creation

---

## 🧱 Tech Stack

- **NestJS** - main backend framework
- **TypeORM** - ORM for database
- **Redis + Redlock** - distributed locking
- **Cron (nestjs/schedule)** - for polling jobs every 10 seconds
- **PostgreSQL or any SQL DB** - for job storage

---

## 📌 How It Works

1. **Creating a Job**:
   - Use the `/jobs/createJob` endpoint to schedule a job.
   - define:
     - `type` of job (e.g., `sendEmail`)
     - `metadata` (dynamic data like email body)
     - `scheduledTime` to run
     - `recurring` as `true/false`

2. **Job Scheduler**:
   - Every 10 seconds, `SchedulerService` checks the DB:
     - `pending` jobs with `scheduledTime <= now`
     - `running` jobs that failed and need retry (`nextRetryTime <= now`)
   - Each job is locked using Redis (`locks:job:<id>`) to prevent duplicate execution.

3. **Job Execution**:
   - If a matching job handler exists, the job is run.
   - If it's recurring, next run is scheduled 24 hours later.
   - Retry count is incremented if the job fails.
   - After max retries, job is marked as `failed`.
