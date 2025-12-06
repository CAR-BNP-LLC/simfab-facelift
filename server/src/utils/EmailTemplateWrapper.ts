/**
 * Email Template Wrapper
 * Wraps email content in a styled HTML template matching SimFab theme
 */

export class EmailTemplateWrapper {
  private static readonly LOGO_URL = '/SimFab-logo-red-black-min-crop.svg';
  private static readonly BRAND_COLOR = '#c5303b'; // SimFab Red
  private static readonly BG_BLACK = '#000000'; // Pure black background
  private static readonly CARD_BG = '#0a0a0a'; // Very dark card background
  private static readonly BORDER_COLOR = '#1a1a1a'; // Subtle border
  private static readonly TEXT_PRIMARY = '#ffffff'; // White text
  private static readonly TEXT_SECONDARY = '#cccccc'; // Light gray
  private static readonly TEXT_MUTED = '#888888'; // Muted gray

  /**
   * Get and normalize frontend URL
   * Ensures URL has proper protocol (https:// for production, http:// for localhost)
   */
  private static getFrontendUrl(): string {
    // Check environment variables first
    let url = process.env.FRONTEND_URL 
      || process.env.VITE_FRONTEND_URL 
      || process.env.API_URL?.replace('/api', '');
    
    // If no env var is set, try to detect production environment
    if (!url) {
      // Check multiple indicators of production environment
      const isProduction = 
        process.env.NODE_ENV === 'production' ||
        process.env.VERCEL_ENV === 'production' ||
        process.env.RAILWAY_ENVIRONMENT === 'production' ||
        process.env.HEROKU_APP_NAME !== undefined ||
        (typeof process.env.HOSTNAME === 'string' && !process.env.HOSTNAME.includes('localhost')) ||
        (typeof process.env.HOST === 'string' && !process.env.HOST.includes('localhost'));
      
      url = isProduction ? 'simfab.com' : 'localhost:5173';
    }
    
    // Normalize URL: add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      // For production or if URL doesn't contain localhost, use https
      // For localhost, use http
      if (url.includes('localhost') || url.includes('127.0.0.1')) {
        url = `http://${url}`;
      } else {
        url = `https://${url}`;
      }
    }
    
    return url;
  }

  /**
   * Wrap email content with SimFab branded template
   */
  static wrap(
    content: string,
    headerTitle?: string,
    headerImage?: string,
    region: 'us' | 'eu' = 'us'
  ): string {
    // Use absolute URL for logo in emails
    const baseUrl = this.getFrontendUrl();
    
    let logoUrl: string;
    
    if (headerImage) {
      // If header_image already has a full URL (http:// or https://), use as-is
      if (headerImage.startsWith('http://') || headerImage.startsWith('https://')) {
        logoUrl = headerImage;
      } else {
        // Make relative paths absolute by prepending baseUrl
        // Ensure path starts with / if it doesn't already
        const cleanPath = headerImage.startsWith('/') ? headerImage : `/${headerImage}`;
        logoUrl = `${baseUrl}${cleanPath}`;
      }
    } else {
      // Default logo - use absolute URL with baseUrl prefix
      logoUrl = `${baseUrl}${this.LOGO_URL}`;
    }
    
    // Debug: log logo URL construction to help diagnose production issues
    console.log(`📧 [DEBUG] Logo URL Construction:`, {
      finalLogoUrl: logoUrl,
      baseUrl,
      headerImage: headerImage || 'default (using LOGO_URL constant)',
      logoPath: headerImage || this.LOGO_URL,
      FRONTEND_URL: process.env.FRONTEND_URL || '(not set)',
      VITE_FRONTEND_URL: process.env.VITE_FRONTEND_URL || '(not set)',
      NODE_ENV: process.env.NODE_ENV || '(not set)',
      VERCEL_ENV: process.env.VERCEL_ENV || '(not set)',
      HOSTNAME: process.env.HOSTNAME || '(not set)'
    });
    
    const title = headerTitle || 'SimFab';
    
    // Determine support email based on region
    const supportEmail = region === 'eu' ? 'eu@simfab.com' : 'info@simfab.com';
    
    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <title>${title}</title>
      <!--[if mso]>
      <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: ${this.BG_BLACK}; font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${this.BG_BLACK};">
        <tr>
          <td align="center" style="padding: 50px 20px;">
            <!-- Main Container -->
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: ${this.CARD_BG}; border-radius: 12px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);">
              <!-- Logo Header -->
              <tr>
                <td style="padding: 40px 40px 20px 40px; text-align: center; border-bottom: 1px solid ${this.BORDER_COLOR};">
                  <img src="${logoUrl}" alt="SimFab" style="max-width: 160px; height: auto; display: block; margin: 0 auto;" />
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 50px 40px; background-color: ${this.CARD_BG}; color: ${this.TEXT_PRIMARY};">
                  ${content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: ${this.BG_BLACK}; padding: 40px; text-align: center; border-top: 1px solid ${this.BORDER_COLOR};">
                  <p style="margin: 0 0 12px 0; color: ${this.TEXT_MUTED}; font-size: 12px; line-height: 1.6;">
                    &copy; ${new Date().getFullYear()} SimFab. All rights reserved.
                  </p>
                  <p style="margin: 0 0 12px 0; color: ${this.TEXT_MUTED}; font-size: 12px; line-height: 1.6;">
                    Questions? <a href="mailto:${supportEmail}" style="color: ${this.BRAND_COLOR}; text-decoration: none;">${supportEmail}</a>
                  </p>
                  <p style="margin: 0; color: ${this.TEXT_MUTED}; font-size: 12px; line-height: 1.6;">
                    <a href="${process.env.FRONTEND_URL || 'https://www.simfab.com'}" style="color: ${this.BRAND_COLOR}; text-decoration: none; font-weight: 500;">Visit SimFab.com</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>`;
  }

  /**
   * Generate styles for common email elements
   */
  static getStyles(): string {
    return `
      <style type="text/css">
        /* Email-safe styles */
        .email-content {
          color: ${this.TEXT_PRIMARY};
          font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
          font-size: 16px;
          line-height: 1.6;
        }
        .email-content h1, .email-content h2, .email-content h3 {
          color: ${this.TEXT_PRIMARY};
          font-family: 'Roboto Condensed', 'Roboto', Arial, sans-serif;
          font-weight: 700;
          margin-top: 0;
        }
        .email-content h1 {
          font-size: 28px;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        .email-content h2 {
          font-size: 24px;
          margin-bottom: 20px;
          color: ${this.BRAND_COLOR};
        }
        .email-content p {
          color: ${this.TEXT_SECONDARY};
          margin-bottom: 16px;
        }
        .email-content a {
          color: ${this.BRAND_COLOR};
          text-decoration: none;
        }
        .email-content a:hover {
          text-decoration: underline;
        }
        .email-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 24px 0;
          background-color: #1a1a1a;
        }
        .email-content th {
          background-color: ${this.BORDER_COLOR};
          color: ${this.TEXT_PRIMARY};
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid ${this.BRAND_COLOR};
        }
        .email-content td {
          padding: 12px;
          border-bottom: 1px solid ${this.BORDER_COLOR};
          color: ${this.TEXT_SECONDARY};
        }
        .email-content .button {
          display: inline-block;
          padding: 16px 32px;
          background-color: ${this.BRAND_COLOR};
          color: ${this.TEXT_PRIMARY};
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
          font-size: 16px;
        }
        .email-content .button:hover {
          background-color: #d42a37;
        }
        .email-content .info-box {
          background-color: ${this.BORDER_COLOR};
          border-left: 3px solid ${this.BRAND_COLOR};
          padding: 24px;
          margin: 24px 0;
          border-radius: 8px;
        }
        .email-content .highlight {
          color: ${this.BRAND_COLOR};
          font-weight: 600;
        }
      </style>
    `;
  }

  /**
   * Create a styled button link
   */
  static createButton(href: string, text: string): string {
    return `
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
        <tr>
          <td align="center">
            <a href="${href}" style="display: inline-block; padding: 14px 28px; background-color: ${this.BRAND_COLOR}; color: ${this.TEXT_PRIMARY}; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">${text}</a>
          </td>
        </tr>
      </table>
    `;
  }

  /**
   * Wrap marketing email content with SimFab branded template and unsubscribe footer
   * This ensures GDPR compliance by always including an unsubscribe link
   */
  static wrapMarketingEmail(
    content: string,
    unsubscribeToken: string,
    headerTitle?: string,
    headerImage?: string,
    region: 'us' | 'eu' = 'us'
  ): string {
    const baseUrl = this.getFrontendUrl();
    
    const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
    
    // Add unsubscribe footer to content
    const contentWithUnsubscribe = `
      ${content}
      <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid ${this.BORDER_COLOR};">
        <p style="margin: 0 0 12px 0; color: ${this.TEXT_MUTED}; font-size: 12px; line-height: 1.6; text-align: center;">
          If you no longer wish to receive these emails, you can 
          <a href="${unsubscribeUrl}" style="color: ${this.BRAND_COLOR}; text-decoration: underline;">unsubscribe here</a>.
        </p>
      </div>
    `;
    
    // Use the regular wrap method with the content that includes unsubscribe
    return this.wrap(contentWithUnsubscribe, headerTitle, headerImage, region);
  }
}

