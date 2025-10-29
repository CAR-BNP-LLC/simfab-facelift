/**
 * Email Template Wrapper
 * Wraps email content in a styled HTML template matching SimFab theme
 */

export class EmailTemplateWrapper {
  private static readonly LOGO_URL = '/SimFab-logo-red-black-min-crop.svg';
  private static readonly BRAND_COLOR = '#c5303b'; // SimFab Red
  private static readonly DARK_BG = '#0b0b0b'; // Dark background
  private static readonly CARD_BG = '#1a1a1a'; // Card background
  private static readonly BORDER_COLOR = '#2b2b2b'; // Border color
  private static readonly TEXT_PRIMARY = '#ffffff'; // White text
  private static readonly TEXT_SECONDARY = '#e5e5e5'; // Light gray
  private static readonly TEXT_MUTED = '#999999'; // Muted gray

  /**
   * Wrap email content with SimFab branded template
   */
  static wrap(
    content: string,
    headerTitle?: string,
    headerImage?: string
  ): string {
    // Use absolute URL for logo in emails
    const baseUrl = process.env.FRONTEND_URL || process.env.API_URL?.replace('/api', '') || 'http://localhost:5173';
    let logoUrl: string;
    
    if (headerImage) {
      // If header_image starts with /, it's a relative path - make it absolute
      logoUrl = headerImage.startsWith('http') 
        ? headerImage 
        : `${baseUrl}${headerImage.startsWith('/') ? headerImage : '/' + headerImage}`;
    } else {
      // Default logo
      logoUrl = `${baseUrl}${this.LOGO_URL}`;
    }
    
    const title = headerTitle || 'SimFab';
    
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
<body style="margin: 0; padding: 0; background-color: ${this.DARK_BG}; font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${this.DARK_BG};">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; background-color: ${this.CARD_BG}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${this.BRAND_COLOR} 0%, #d42a37 100%); padding: 30px 40px; text-align: center;">
              <img src="${logoUrl}" alt="SimFab" style="max-width: 180px; height: auto; display: block; margin: 0 auto;" />
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 40px; background-color: ${this.CARD_BG}; color: ${this.TEXT_PRIMARY};">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: ${this.BORDER_COLOR}; padding: 30px 40px; text-align: center; border-top: 1px solid ${this.BORDER_COLOR};">
              <p style="margin: 0 0 10px 0; color: ${this.TEXT_MUTED}; font-size: 12px; line-height: 1.6;">
                &copy; ${new Date().getFullYear()} SimFab. All rights reserved.
              </p>
              <p style="margin: 0 0 10px 0; color: ${this.TEXT_MUTED}; font-size: 12px; line-height: 1.6;">
                Questions? Contact us at <a href="mailto:info@simfab.com" style="color: ${this.BRAND_COLOR}; text-decoration: none;">info@simfab.com</a>
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
          background-color: ${this.DARK_BG};
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
          padding: 14px 28px;
          background-color: ${this.BRAND_COLOR};
          color: ${this.TEXT_PRIMARY};
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          margin: 20px 0;
          text-align: center;
        }
        .email-content .button:hover {
          background-color: #d42a37;
        }
        .email-content .info-box {
          background-color: ${this.BORDER_COLOR};
          border-left: 4px solid ${this.BRAND_COLOR};
          padding: 16px;
          margin: 20px 0;
          border-radius: 4px;
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
}

