import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import UserModel, { User, NewsletterSubscription } from '../models/user';

// Use crypto for generating UUIDs instead of uuid package
import { randomUUID } from 'crypto';

// Extend session interface
declare module 'express-session' {
  interface SessionData {
    userId?: number;
    userEmail?: string;
  }
}

// Create user model instance
const userModel = new UserModel();

export class AuthController {
  // Register a new user
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, first_name, last_name, subscribe_newsletter } = req.body;

      // Validate required fields
      if (!email || !password || !first_name || !last_name) {
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
        first_name,
        last_name,
        is_active: true
      });

      // Subscribe to newsletter if requested
      if (subscribe_newsletter) {
        const subscribedAt = new Date().toISOString();
        await userModel.subscribeToNewsletter(email, subscribedAt);
      }

      // Set session
      req.session.userId = newUser.id;
      req.session.userEmail = newUser.email;

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
          id: newUser.id,
          email: newUser.email,
          first_name: newUser.first_name,
          last_name: newUser.last_name,
          newsletter_subscribed: subscribe_newsletter || false
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

      // Check if user is active
      if (!user.is_active) {
        res.status(401).json({
          success: false,
          error: 'Account is deactivated'
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

      // Set session
      req.session.userId = user.id;
      req.session.userEmail = user.email;

      // Check newsletter subscription
      const newsletterSubscription = await userModel.getNewsletterSubscription(email);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          newsletter_subscribed: newsletterSubscription?.is_active || false,
          newsletter_subscribed_at: newsletterSubscription?.subscribed_at || null
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

      // Log the reset code (as requested)
      console.log(`Password reset code for ${email}: ${resetCode}`);
      console.log(`Reset code expires at: ${expiresAt}`);

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
          subscribed_at: subscription.subscribed_at,
          is_active: subscription.is_active
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
      const { email } = req.body;

      if (!email) {
        res.status(400).json({
          success: false,
          error: 'Email is required'
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

  // Get current user profile
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.session.userId;

      if (!userId) {
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

      // Get newsletter subscription
      const newsletterSubscription = await userModel.getNewsletterSubscription(user.email);

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          newsletter_subscribed: newsletterSubscription?.is_active || false,
          newsletter_subscribed_at: newsletterSubscription?.subscribed_at || null,
          created_at: user.created_at
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
