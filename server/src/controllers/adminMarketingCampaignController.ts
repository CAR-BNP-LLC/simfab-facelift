/**
 * Admin Marketing Campaign Controller
 * Handles admin marketing campaign management endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { MarketingCampaignService } from '../services/MarketingCampaignService';
import { EmailService } from '../services/EmailService';
import { successResponse } from '../utils/response';
import { ValidationError, NotFoundError } from '../utils/errors';

export class AdminMarketingCampaignController {
  private campaignService: MarketingCampaignService;
  private emailService: EmailService;

  constructor(pool: Pool) {
    this.campaignService = new MarketingCampaignService(pool);
    this.emailService = new EmailService(pool);
  }

  /**
   * List all campaigns
   * GET /api/admin/marketing-campaigns
   */
  listCampaigns = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page = 1, limit = 20, status } = req.query;

      const result = await this.campaignService.getCampaigns({
        status: status as string,
        page: Number(page),
        limit: Number(limit)
      });

      res.json(successResponse({
        campaigns: result.campaigns,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: result.total,
          totalPages: Math.ceil(result.total / Number(limit))
        }
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get single campaign
   * GET /api/admin/marketing-campaigns/:id
   */
  getCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const campaign = await this.campaignService.getCampaign(Number(id));

      if (!campaign) {
        throw new NotFoundError('Marketing Campaign', { campaignId: id });
      }

      res.json(successResponse(campaign));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create new campaign
   * POST /api/admin/marketing-campaigns
   */
  createCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, subject, content } = req.body;
      const userId = (req.session as any).userId;

      if (!userId) {
        throw new ValidationError('User must be authenticated');
      }

      if (!name || !subject || !content) {
        throw new ValidationError('Name, subject, and content are required');
      }

      const campaign = await this.campaignService.createCampaign({
        name,
        subject,
        content,
        created_by: userId
      });

      res.status(201).json(successResponse(campaign, 'Campaign created successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update campaign
   * PUT /api/admin/marketing-campaigns/:id
   */
  updateCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { name, subject, content, status } = req.body;

      // Check campaign exists
      const existingCampaign = await this.campaignService.getCampaign(Number(id));
      if (!existingCampaign) {
        throw new NotFoundError('Marketing Campaign', { campaignId: id });
      }

      // Don't allow updating sent campaigns
      if (existingCampaign.status === 'sent' && status && status !== 'sent') {
        throw new ValidationError('Cannot modify a sent campaign');
      }

      const campaign = await this.campaignService.updateCampaign(Number(id), {
        name,
        subject,
        content,
        status: status as any
      });

      res.json(successResponse(campaign, 'Campaign updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Send campaign to all eligible users
   * POST /api/admin/marketing-campaigns/:id/send
   */
  sendCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const campaign = await this.campaignService.getCampaign(Number(id));

      if (!campaign) {
        throw new NotFoundError('Marketing Campaign', { campaignId: id });
      }

      if (campaign.status === 'sent') {
        throw new ValidationError('Campaign has already been sent');
      }

      if (campaign.status === 'sending') {
        throw new ValidationError('Campaign is currently being sent');
      }

      // Get eligible users
      const eligibleUsers = await this.campaignService.getEligibleUsers();

      if (eligibleUsers.length === 0) {
        throw new ValidationError('No eligible users found');
      }

      // Mark campaign as sending
      await this.campaignService.markCampaignAsSending(Number(id));

      // Create recipient records
      const recipients = await this.campaignService.createRecipients(Number(id), eligibleUsers);

      // Send emails asynchronously (don't wait for all to complete)
      let sentCount = 0;
      let errorCount = 0;

      // Send emails in batches to avoid overwhelming the email service
      const batchSize = 10;
      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(async (recipient) => {
            try {
              const result = await this.emailService.sendMarketingEmail({
                recipientEmail: recipient.email,
                recipientName: `${recipient.user_id ? eligibleUsers.find(u => u.id === recipient.user_id)?.first_name : ''} ${recipient.user_id ? eligibleUsers.find(u => u.id === recipient.user_id)?.last_name : ''}`.trim() || recipient.email,
                subject: campaign.subject,
                content: campaign.content,
                unsubscribeToken: recipient.unsubscribe_token
              });
              
              if (result.success) {
                sentCount++;
                console.log(`✅ Email sent to ${recipient.email}`);
              } else {
                errorCount++;
                console.error(`❌ Failed to send email to ${recipient.email}:`, result.error);
              }
            } catch (error) {
              console.error(`❌ Error sending email to ${recipient.email}:`, error);
              errorCount++;
            }
          })
        );

        // Small delay between batches to avoid rate limiting
        if (i + batchSize < recipients.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Mark campaign as sent
      await this.campaignService.markCampaignAsSent(Number(id), sentCount);

      res.json(successResponse({
        campaign_id: Number(id),
        total_recipients: recipients.length,
        sent_count: sentCount,
        error_count: errorCount
      }, 'Campaign sent successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get campaign statistics
   * GET /api/admin/marketing-campaigns/:id/stats
   */
  getCampaignStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const campaign = await this.campaignService.getCampaign(Number(id));

      if (!campaign) {
        throw new NotFoundError('Marketing Campaign', { campaignId: id });
      }

      const stats = await this.campaignService.getCampaignStats(Number(id));

      res.json(successResponse({
        campaign,
        stats
      }));
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get count of eligible recipients
   * GET /api/admin/marketing-campaigns/eligible-count
   */
  getEligibleCount = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const count = await this.campaignService.getEligibleUserCount();
      res.json(successResponse({ count }));
    } catch (error) {
      next(error);
    }
  };
}

