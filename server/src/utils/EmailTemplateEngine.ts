/**
 * Email Template Engine
 * Handles variable replacement in email templates
 */

export class EmailTemplateEngine {
  /**
   * Replace variables in template string
   * Supports {{variable}} syntax
   */
  replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // Replace {{variable}} with actual values
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const value = this.formatValue(variables[key]);
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
}

