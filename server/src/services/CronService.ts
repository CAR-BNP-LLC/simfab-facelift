/**
 * Cron Service
 * Manages scheduled tasks using node-cron
 */

import * as cron from 'node-cron';
import { Pool } from 'pg';
import { CleanupService } from './CleanupService';

export interface CronJobConfig {
  schedule: string;
  enabled: boolean;
  timezone?: string;
  description?: string;
}

export interface CronJob {
  name: string;
  task: cron.ScheduledTask;
  config: CronJobConfig;
  callback: () => Promise<void>;
  lastRun?: Date;
  nextRun?: Date;
}

export class CronService {
  private jobs: Map<string, CronJob> = new Map();
  private cleanupService: CleanupService;

  constructor(private pool: Pool) {
    this.cleanupService = new CleanupService(pool);
  }

  /**
   * Initialize all cron jobs
   */
  initialize(): void {
    console.log('🕐 Initializing cron jobs...');

    // Cleanup job configuration
    const cleanupConfig: CronJobConfig = {
      schedule: process.env.CLEANUP_SCHEDULE || '*/5 * * * *',
      enabled: process.env.ENABLE_CLEANUP_CRON !== 'false',
      timezone: process.env.TZ || 'UTC',
      description: 'Clean up expired orders and stock reservations'
    };

    this.addJob('cleanup', cleanupConfig, async () => {
      try {
        console.log('🔄 Running automatic cleanup of expired orders...');
        const result = await this.cleanupService.cleanupExpiredOrders();
        if (result.expiredOrders > 0) {
          console.log(`✅ Cleanup completed: ${result.expiredOrders} expired orders removed`);
        }
      } catch (error) {
        console.error('❌ Error during automatic cleanup:', error);
      }
    });

    console.log(`📋 Cron jobs initialized: ${this.jobs.size} jobs scheduled`);
  }

  /**
   * Add a new cron job
   */
  addJob(name: string, config: CronJobConfig, callback: () => Promise<void>): boolean {
    if (this.jobs.has(name)) {
      console.warn(`⚠️  Cron job '${name}' already exists, skipping...`);
      return false;
    }

    if (!config.enabled) {
      console.log(`⏸️  Cron job '${name}' is disabled`);
      return false;
    }

    // Validate cron expression
    if (!cron.validate(config.schedule)) {
      console.error(`❌ Invalid cron schedule for '${name}': ${config.schedule}`);
      return false;
    }

    // Create the cron task
    const task = cron.schedule(config.schedule, async () => {
      const job = this.jobs.get(name);
      if (job) {
        job.lastRun = new Date();
        console.log(`🔄 Executing cron job: ${name}`);
        await callback();
      }
    }, {
      timezone: config.timezone
    });

    // Store job information
    const job: CronJob = {
      name,
      task,
      config,
      callback,
      lastRun: undefined,
      nextRun: this.getNextRunTime(config.schedule)
    };

    this.jobs.set(name, job);

    console.log(`✅ Cron job '${name}' scheduled: ${config.schedule} (${config.description || 'No description'})`);
    return true;
  }

  /**
   * Remove a cron job
   */
  removeJob(name: string): boolean {
    const job = this.jobs.get(name);
    if (!job) {
      console.warn(`⚠️  Cron job '${name}' not found`);
      return false;
    }

    job.task.destroy();
    this.jobs.delete(name);
    console.log(`🗑️  Cron job '${name}' removed`);
    return true;
  }

  /**
   * Get all cron jobs status
   */
  getJobsStatus(): Array<{
    name: string;
    schedule: string;
    enabled: boolean;
    lastRun: Date | null;
    nextRun: Date | null;
    description?: string;
  }> {
    return Array.from(this.jobs.values()).map(job => ({
      name: job.name,
      schedule: job.config.schedule,
      enabled: job.config.enabled,
      lastRun: job.lastRun || null,
      nextRun: job.nextRun || null,
      description: job.config.description
    }));
  }

  /**
   * Manually trigger a cron job
   */
  async triggerJob(name: string): Promise<boolean> {
    const job = this.jobs.get(name);
    if (!job) {
      console.warn(`⚠️  Cron job '${name}' not found`);
      return false;
    }

    try {
      console.log(`🔄 Manually triggering cron job: ${name}`);
      job.lastRun = new Date();
      await job.callback();
      console.log(`✅ Cron job '${name}' triggered manually`);
      return true;
    } catch (error) {
      console.error(`❌ Error triggering cron job '${name}':`, error);
      return false;
    }
  }

  /**
   * Stop all cron jobs
   */
  stopAll(): void {
    console.log('🛑 Stopping all cron jobs...');
    this.jobs.forEach((job, name) => {
      job.task.destroy();
      console.log(`⏹️  Stopped cron job: ${name}`);
    });
    this.jobs.clear();
  }

  /**
   * Get next run time for a cron schedule
   */
  private getNextRunTime(schedule: string): Date {
    // This is a simplified calculation - in a real implementation,
    // you might want to use a library like 'cron-parser' for more accurate calculations
    const now = new Date();
    const nextRun = new Date(now.getTime() + 5 * 60 * 1000); // Default to 5 minutes from now
    return nextRun;
  }

  /**
   * Validate cron expression
   */
  static validateSchedule(schedule: string): boolean {
    return cron.validate(schedule);
  }

  /**
   * Get common cron schedule examples
   */
  static getScheduleExamples(): Array<{ schedule: string; description: string }> {
    return [
      { schedule: '*/5 * * * *', description: 'Every 5 minutes' },
      { schedule: '*/15 * * * *', description: 'Every 15 minutes' },
      { schedule: '0 */1 * * *', description: 'Every hour' },
      { schedule: '0 */2 * * *', description: 'Every 2 hours' },
      { schedule: '0 0 * * *', description: 'Daily at midnight' },
      { schedule: '0 0 * * 0', description: 'Weekly on Sunday at midnight' },
      { schedule: '0 0 1 * *', description: 'Monthly on the 1st at midnight' }
    ];
  }
}
