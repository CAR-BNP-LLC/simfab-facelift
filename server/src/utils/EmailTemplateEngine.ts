/**
 * Email Template Engine
 * Handles variable replacement in email templates
 */

export class EmailTemplateEngine {
  /**
   * Get the frontend URL from environment variables
   * Normalizes URLs to ensure they have a protocol (https:// for production, http:// for dev)
   */
  private getFrontendUrl(): string {
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
   * Replace variables in template string
   * Supports {{variable}} syntax
   * Also automatically replaces {{frontend_url}} with the correct frontend URL
   */
  replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Add frontend_url to variables if not already present
    const allVariables: Record<string, any> = {
      ...variables,
      frontend_url: this.getFrontendUrl()
    };
    
    // Replace {{variable}} with actual values
    Object.keys(allVariables).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const value = this.formatValue(allVariables[key]);
      result = result.replace(regex, value);
    });
    
    return result;
  }

  /**
   * Format value based on type
   */
  private formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'number') {
      // Format currency if decimal
      if (value % 1 !== 0) {
        return `$${value.toFixed(2)}`;
      }
      return value.toString();
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }

  /**
   * Escape HTML in values (for security)
   */
  escapeHtml(value: any): string {
    const htmlString = String(value);
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    
    return htmlString.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Check if template has variables
   */
  hasVariables(template: string): boolean {
    return /\{\{(\w+)\}\}/.test(template);
  }

  /**
   * Extract all variables from template
   */
  extractVariables(template: string): string[] {
    const regex = /\{\{(\w+)\}\}/g;
    const variables: string[] = [];
    let match;
    
    while ((match = regex.exec(template)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }
    
    return variables;
  }

  /**
   * Replace hardcoded localhost URLs with the correct frontend URL
   * This ensures email links work in both development and production
   * This is a fallback for templates that still have hardcoded localhost URLs
   */
  replaceLocalhostUrls(template: string): string {
    const frontendUrl = this.getFrontendUrl();
    
    // Replace various localhost patterns
    // Match: http://localhost:5173, http://localhost:3000, http://127.0.0.1:5173, etc.
    const localhostPatterns = [
      /http:\/\/localhost:\d+/g,
      /http:\/\/127\.0\.0\.1:\d+/g,
      /https?:\/\/localhost/g,
      /https?:\/\/127\.0\.0\.1/g
    ];
    
    let result = template;
    
    // Replace all localhost URLs with the correct frontend URL
    localhostPatterns.forEach(pattern => {
      result = result.replace(pattern, frontendUrl);
    });
    
    return result;
  }
}

