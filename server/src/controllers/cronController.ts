import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { CronService } from '../services/CronService';
import { successResponse, errorResponse } from '../utils/response';
import { requireAdmin } from '../middleware/auth';

export class CronController {
  private cronService: CronService;

  constructor(pool: Pool, cronService: CronService) {
    this.cronService = cronService;
  }

  /**
   * Get all cron jobs status
   * GET /api/admin/cron/status
   */
  getCronStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const jobs = this.cronService.getJobsStatus();
      const examples = CronService.getScheduleExamples();

      res.json(successResponse({
        data: {
          jobs,
          examples,
          totalJobs: jobs.length,
          enabledJobs: jobs.filter(job => job.enabled).length
        }
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Manually trigger a cron job
   * POST /api/admin/cron/trigger/:jobName
   */
  triggerJob = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { jobName } = req.params;
      const success = await this.cronService.triggerJob(jobName);

      if (success) {
        res.json(successResponse({
          message: `Cron job '${jobName}' triggered successfully`,
          data: { jobName, triggeredAt: new Date() }
        }));
      } else {
        res.status(404).json(errorResponse(`Cron job '${jobName}' not found`));
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * Validate a cron schedule
   * POST /api/admin/cron/validate
   */
  validateSchedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { schedule } = req.body;

      if (!schedule) {
        return res.status(400).json(errorResponse('Schedule is required'));
      }

      const isValid = CronService.validateSchedule(schedule);
      const examples = CronService.getScheduleExamples();

      res.json(successResponse({
        data: {
          schedule,
          isValid,
          examples
        }
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get cron schedule examples
   * GET /api/admin/cron/examples
   */
  getScheduleExamples = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const examples = CronService.getScheduleExamples();

      res.json(successResponse({
        data: { examples }
      }));
    } catch (error) {
      next(error);
    }
  };
}
