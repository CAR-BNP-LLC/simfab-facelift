import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import UserModel, { User, NewsletterSubscription } from '../models/user';
import RBACModel from '../models/rbac';
import { Pool } from 'pg';
import { EmailService } from '../services/EmailService';
import { getSSLConfig } from '../config/database';
import { validateUnsubscribeToken } from '../utils/unsubscribeToken';
import { MarketingCampaignService } from '../services/MarketingCampaignService';

// Use crypto for generating UUIDs instead of uuid package
import { randomUUID } from 'crypto';

// Extend session interface
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userEmail?: string;
    role?: string;
    authorities?: string[];
  }
}

// Create model instances
const userModel = new UserModel();
// Create separate pool instance for RBAC model
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost:5432/simfab_dev';
const pool = new Pool({
  connectionString,
  ssl: getSSLConfig(connectionString),
  connectionTimeoutMillis: 30000, // 30 seconds timeout for resource-constrained environments
});
const rbacModel = new RBACModel(pool);
const emailService = new EmailService(pool);
emailService.initialize();

export class AuthController {
  // Helper method to load user authorities and roles
  static async loadUserAuthorities(userId: number): Promise<{
    roles: Array<{ id: number; name: string }>;
    authorities: string[];
  }> {
    try {
      const [roles, authorities] = await Promise.all([
        rbacModel.getUserRoles(userId),
        rbacModel.getUserAuthorities(userId)
      ]);

      return {
        roles: roles.map(role => ({ id: role.id, name: role.name })),
        authorities
      };
    } catch (error) {
      console.error('Failed to load user authorities:', error);
      return { roles: [], authorities: [] };
    }
  }

  // Helper method to refresh user authorities in session
  static async refreshAuthorities(req: Request, res: Response, next: () => void): Promise<void> {
    if (!req.session?.userId) {
      next();
      return;
    }

    try {
      if (req.session.userId) {
        const { roles, authorities } = await AuthController.loadUserAuthorities(req.session.userId);
        req.session.authorities = authorities;
      }
      next();
    } catch (error) {
      console.error('Failed to refresh authorities:', error);
      next();
    }
  }
  // Register a new user
  static async register(req: Request, res: Response): Promise<void> {
    try {
      // Accept both camelCase (from frontend) and snake_case (legacy)
      const { 
        email, 
        password, 
        confirmPassword,
        firstName, 
        lastName, 
        phone,
        company,
        subscribeNewsletter,
        // Legacy snake_case support
        first_name, 
        last_name, 
        subscribe_newsletter 
      } = req.body;

      // Use camelCase or fallback to snake_case
      const userFirstName = firstName || first_name;
      const userLastName = lastName || last_name;
      const subscribeToNewsletter = subscribeNewsletter !== undefined ? subscribeNewsletter : subscribe_newsletter;
      
      // Validate required fields
      if (!email || !password || !userFirstName || !userLastName) {
        res.status(400).json({
          success: false,
          error: 'All fields are required'
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
        return;
      }

      // Validate password strength
      if (password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long'
        });
        return;
      }

      // Check if user already exists
      const existingUser = await userModel.getUserByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User with this email already exists'
        });
        return;
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user
      const newUser = await userModel.createUser({
        email,
        password: hashedPassword,
        first_name: userFirstName,
        last_name: userLastName
      });

      // Subscribe to newsletter if requested
      if (subscribeToNewsletter) {
        try {
          const subscribedAt = new Date().toISOString();
          const subscription = await userModel.subscribeToNewsletter(email, subscribedAt);
          // Newsletter subscription created - no need to log
        } catch (subError) {
          console.error('❌ Failed to create newsletter subscription:', subError);
          // Don't fail registration if newsletter subscription fails
        }
      } else {
        // User did not subscribe - no need to log
      }

      // Trigger new account creation email event
      try {
        await emailService.triggerEvent(
          'auth.account_created',
          {
            customer_name: userFirstName || email,
            login_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`
          },
          {
            customerEmail: email,
            customerName: userFirstName || email
          }
        );
      } catch (emailError) {
        console.error('Failed to trigger account created email event:', emailError);
      }

      // Set session
      req.session.userId = newUser.id;
      req.session.userEmail = newUser.email;

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            firstName: newUser.first_name,
            lastName: newUser.last_name,
            role: 'customer',
            emailVerified: false,
            createdAt: newUser.created_at
          },
          verificationEmailSent: false
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Login user
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
        return;
      }

      // Find user by email
      const user = await userModel.getUserByEmail(email);
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({
          success: false,
          error: 'Invalid credentials'
        });
        return;
      }

      // Load user authorities and roles
      const { roles, authorities } = await AuthController.loadUserAuthorities(user.id!);

      // Set session
      req.session.userId = user.id;
      req.session.userEmail = user.email;
      req.session.authorities = authorities;

      // Explicitly save session to ensure it's persisted before sending response
      // This is critical for cross-origin cookies in Chrome
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) {
            console.error('❌ Failed to save session after login:', err);
            reject(err);
          } else {
            // Session saved successfully - no need to log
            resolve();
          }
        });
      });

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: 'customer', // deprecated - use roles instead
            roles,
            authorities,
            emailVerified: false,
            lastLogin: new Date().toISOString()
          },
          session: {
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Logout user
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Logout error:', err);
          res.status(500).json({
            success: false,
            error: 'Could not log out'
          });
        } else {
          res.json({
            success: true,
            message: 'Logged out successfully'
          });
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Request password reset
  static async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required'
        });
        return;
      }

      // Check if user exists
      const user = await userModel.getUserByEmail(email);
      if (!user) {
        // Don't reveal if user exists or not for security
        res.json({
          success: true,
          message: 'If the email exists, a reset code has been sent'
        });
        return;
      }

      // Generate reset code
      const resetCode = randomUUID();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes

      // Store reset code
      await userModel.createPasswordReset(user.id!, resetCode, expiresAt);

      // Trigger password reset email event
      try {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetCode}`;
        await emailService.triggerEvent(
          'auth.password_reset',
          {
            reset_url: resetUrl,
            expire_hours: '15 minutes',
            customer_name: user.first_name || email
          },
          {
            customerEmail: email,
            customerName: user.first_name || email
          }
        );
      } catch (emailError) {
        console.error('Failed to trigger password reset email event:', emailError);
      }

      // Log the reset code (as requested)

      res.json({
        success: true,
        message: 'If the email exists, a reset code has been sent'
      });
    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Reset password with code
  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { reset_code, new_password } = req.body;

      if (!reset_code || !new_password) {
        res.status(400).json({
          success: false,
          error: 'Reset code and new password are required'
        });
        return;
      }

      // Validate password strength
      if (new_password.length < 6) {
        res.status(400).json({
          success: false,
          error: 'Password must be at least 6 characters long'
        });
        return;
      }

      // Find valid reset code
      const passwordReset = await userModel.getPasswordResetByCode(reset_code);
      if (!passwordReset) {
        res.status(400).json({
          success: false,
          error: 'Invalid or expired reset code'
        });
        return;
      }

      // Hash new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(new_password, saltRounds);

      // Update user password
      await userModel.updateUserPassword(passwordReset.user_id, hashedPassword);

      // Mark reset code as used
      await userModel.markPasswordResetAsUsed(reset_code);

      res.json({
        success: true,
        message: 'Password reset successfully'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Subscribe to newsletter
  static async subscribeNewsletter(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required'
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          success: false,
          error: 'Invalid email format'
        });
        return;
      }

      const subscribedAt = new Date().toISOString();
      const subscription = await userModel.subscribeToNewsletter(email, subscribedAt);

      res.json({
        success: true,
        message: 'Successfully subscribed to newsletter',
        data: {
          email: subscription.email,
          status: subscription.status,
          created_at: subscription.created_at
        }
      });
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Unsubscribe from newsletter
  static async unsubscribeNewsletter(req: Request, res: Response): Promise<void> {
    try {
      const { email, token } = req.body;

      // Support both token-based (from email links) and email-based unsubscribe
      if (token) {
        // Token-based unsubscribe (from marketing email links)
        const tokenData = validateUnsubscribeToken(token);
        
        if (!tokenData) {
          res.status(400).json({
            success: false,
            error: 'Invalid or expired unsubscribe token'
          });
          return;
        }

        // Mark recipient as unsubscribed in marketing campaign
        const campaignService = new MarketingCampaignService(pool);
        await campaignService.markRecipientAsUnsubscribed(token);
        
        // Also unsubscribe from newsletter
        await userModel.unsubscribeFromNewsletter(tokenData.email);

        res.json({
          success: true,
          message: 'Successfully unsubscribed from marketing emails'
        });
        return;
      }

      // Email-based unsubscribe (legacy support)
      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email or token is required'
        });
        return;
      }

      await userModel.unsubscribeFromNewsletter(email);

      res.json({
        success: true,
        message: 'Successfully unsubscribed from newsletter'
      });
    } catch (error) {
      console.error('Newsletter unsubscription error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Unsubscribe via token (GET endpoint for email links)
  static async unsubscribeByToken(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.query;

      // Extract token string from query parameter
      let tokenStr: string | null = null;
      if (typeof token === 'string') {
        tokenStr = token;
      } else if (Array.isArray(token) && token.length > 0 && typeof token[0] === 'string') {
        tokenStr = token[0];
      }

      if (!tokenStr) {
        console.error('❌ No token provided in unsubscribe request');
        res.status(400).json({
          success: false,
          error: 'Unsubscribe token is required'
        });
        return;
      }

      // First, try to find the recipient by token in the database
      // This is more reliable than validating the signature
      const campaignService = new MarketingCampaignService(pool);
      const recipient = await campaignService.getRecipientByToken(tokenStr);
      
      if (recipient) {
        // Token exists in database - mark as unsubscribed
        await campaignService.markRecipientAsUnsubscribed(tokenStr);
        await userModel.unsubscribeFromNewsletter(recipient.email);
        
        // Unsubscribed successfully - no need to log
        
        res.json({
          success: true,
          message: 'Successfully unsubscribed from marketing emails'
        });
        return;
      }
      
      // Fallback: Try to validate the token signature
      const tokenData = validateUnsubscribeToken(tokenStr);
      
      if (!tokenData) {
        console.error('❌ Token validation failed - token not found in database and signature invalid');
        res.status(400).json({
          success: false,
          error: 'Invalid or expired unsubscribe token'
        });
        return;
      }

      // Mark recipient as unsubscribed in marketing campaign
      await campaignService.markRecipientAsUnsubscribed(tokenStr);
      
      // Also unsubscribe from newsletter
      await userModel.unsubscribeFromNewsletter(tokenData.email);

      res.json({
        success: true,
        message: 'Successfully unsubscribed from marketing emails'
      });
    } catch (error) {
      console.error('Token-based unsubscription error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  // Get current user profile
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const sessionId = req.sessionID;
      const userId = req.session.userId;

      if (!userId) {
        // User is not authenticated - normal case, no need to log
        res.status(401).json({
          success: false,
          error: 'Not authenticated'
        });
        return;
      }

      const user = await userModel.getUserById(userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Load user authorities and roles
      const { roles, authorities } = await AuthController.loadUserAuthorities(userId);

      // Get newsletter subscription
      const newsletterSubscription = await userModel.getNewsletterSubscription(user.email);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            role: 'customer', // deprecated - use roles instead
            roles,
            authorities,
            emailVerified: false,
            createdAt: user.created_at
          },
          addresses: [],
          stats: {
            totalOrders: 0,
            totalSpent: 0
          }
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}
