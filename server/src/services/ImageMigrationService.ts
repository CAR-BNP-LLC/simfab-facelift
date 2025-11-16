/**
 * Image Migration Service
 * Downloads external images and updates database paths
 */

import { Pool } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import https from 'https';
import http from 'http';
import { URL } from 'url';

export interface MigrationResult {
  totalProducts: number;
  totalVariations: number;
  totalProductImages: number;
  totalVariationOptions: number;
  migratedProductImages: number;
  migratedVariationOptions: number;
  errors: Array<{ type: string; id: number; url: string; error: string }>;
}

export class ImageMigrationService {
  private uploadsDir: string;
  private siteDomains: string[];

  constructor(private pool: Pool) {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    // Get site domains from environment or use defaults
    const frontendUrl = process.env.FRONTEND_URL || '';
    const apiUrl = process.env.API_URL || '';
    
    this.siteDomains = [];
    if (frontendUrl) {
      try {
        const frontendDomain = new URL(frontendUrl).hostname;
        this.siteDomains.push(frontendDomain);
      } catch (e) {
        // Invalid URL, skip
      }
    }
    if (apiUrl) {
      try {
        const apiDomain = new URL(apiUrl).hostname;
        this.siteDomains.push(apiDomain);
      } catch (e) {
        // Invalid URL, skip
      }
    }
    
    // Add common localhost variants
    this.siteDomains.push('localhost', '127.0.0.1');
    
    // Ensure uploads directory exists
    this.ensureUploadDirectory();
  }

  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Check if an image URL is external (not from our site)
   */
  private isExternalImage(url: string | null | undefined): boolean {
    if (!url || !url.trim()) {
      return false;
    }

    // If it's already a local path (starts with /uploads), it's not external
    if (url.startsWith('/uploads/')) {
      return false;
    }

    // If it doesn't start with http:// or https://, assume it's relative/local
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;
      
      // Check if hostname matches any of our site domains
      return !this.siteDomains.some(domain => 
        hostname === domain || hostname.endsWith(`.${domain}`)
      );
    } catch (e) {
      // Invalid URL, treat as external to be safe
      return true;
    }
  }

  /**
   * Download image from URL
   */
  private async downloadImage(imageUrl: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const url = new URL(imageUrl);
      const protocol = url.protocol === 'https:' ? https : http;
      
      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ImageMigration/1.0)'
        },
        timeout: 30000 // 30 second timeout
      };

      const request = protocol.get(imageUrl, options, (response) => {
        if (response.statusCode && (response.statusCode < 200 || response.statusCode >= 300)) {
          reject(new Error(`Failed to download image: ${response.statusCode} ${response.statusMessage || 'Unknown error'}`));
          return;
        }

        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => resolve(Buffer.concat(chunks)));
        response.on('error', reject);
      });

      request.on('error', reject);
      request.on('timeout', () => {
        request.destroy();
        reject(new Error('Download timeout'));
      });
      
      request.setTimeout(30000);
    });
  }

  /**
   * Generate a safe filename for the downloaded image
   */
  private generateFilename(originalUrl: string, imageData: Buffer): string {
    const url = new URL(originalUrl);
    const pathname = url.pathname;
    const ext = path.extname(pathname) || this.getExtensionFromMimeType(imageData) || '.jpg';
    
    // Clean filename
    const baseName = path.basename(pathname, ext).replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    
    return `${baseName}-${uniqueSuffix}${ext}`;
  }

  /**
   * Try to determine file extension from image data
   */
  private getExtensionFromMimeType(imageData: Buffer): string | null {
    // Check magic bytes for common image formats
    if (imageData[0] === 0xFF && imageData[1] === 0xD8) return '.jpg';
    if (imageData[0] === 0x89 && imageData[1] === 0x50) return '.png';
    if (imageData[0] === 0x47 && imageData[1] === 0x49) return '.gif';
    if (imageData[0] === 0x52 && imageData[1] === 0x49 && imageData[2] === 0x46 && imageData[3] === 0x46) return '.webp';
    return null;
  }

  /**
   * Save image to uploads directory
   */
  private async saveImage(imageData: Buffer, filename: string): Promise<string> {
    const filePath = path.join(this.uploadsDir, filename);
    await fs.writeFile(filePath, imageData);
    return `/uploads/${filename}`;
  }

  /**
   * Migrate a single image URL
   */
  private async migrateImage(imageUrl: string, baseUrl: string): Promise<string> {
    if (!this.isExternalImage(imageUrl)) {
      return imageUrl; // Already local, return as-is
    }

    try {
      // Download image
      const imageData = await this.downloadImage(imageUrl);
      
      // Generate filename
      const filename = this.generateFilename(imageUrl, imageData);
      
      // Save to uploads
      const localPath = await this.saveImage(imageData, filename);
      
      // Return full URL
      return `${baseUrl}${localPath}`;
    } catch (error) {
      throw new Error(`Failed to migrate image ${imageUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Migrate all product and variation images
   */
  async migrateAllImages(baseUrl: string = ''): Promise<MigrationResult> {
    const result: MigrationResult = {
      totalProducts: 0,
      totalVariations: 0,
      totalProductImages: 0,
      totalVariationOptions: 0,
      migratedProductImages: 0,
      migratedVariationOptions: 0,
      errors: []
    };

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Migrate product images
      const productImagesQuery = await client.query(`
        SELECT id, product_id, image_url
        FROM product_images
        WHERE image_url IS NOT NULL AND image_url != ''
      `);

      result.totalProductImages = productImagesQuery.rows.length;

      for (const image of productImagesQuery.rows) {
        try {
          if (this.isExternalImage(image.image_url)) {
            const newUrl = await this.migrateImage(image.image_url, baseUrl);
            
            await client.query(
              'UPDATE product_images SET image_url = $1 WHERE id = $2',
              [newUrl, image.id]
            );
            
            result.migratedProductImages++;
          }
        } catch (error) {
          result.errors.push({
            type: 'product_image',
            id: image.id,
            url: image.image_url,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Migrate variation option images
      const variationOptionsQuery = await client.query(`
        SELECT vo.id, vo.variation_id, vo.image_url, pv.product_id
        FROM variation_options vo
        JOIN product_variations pv ON vo.variation_id = pv.id
        WHERE vo.image_url IS NOT NULL AND vo.image_url != ''
      `);

      result.totalVariationOptions = variationOptionsQuery.rows.length;

      for (const option of variationOptionsQuery.rows) {
        try {
          if (this.isExternalImage(option.image_url)) {
            const newUrl = await this.migrateImage(option.image_url, baseUrl);
            
            await client.query(
              'UPDATE variation_options SET image_url = $1 WHERE id = $2',
              [newUrl, option.id]
            );
            
            result.migratedVariationOptions++;
          }
        } catch (error) {
          result.errors.push({
            type: 'variation_option',
            id: option.id,
            url: option.image_url,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Get counts for reporting
      const productsCount = await client.query('SELECT COUNT(*) FROM products');
      result.totalProducts = parseInt(productsCount.rows[0].count);

      const variationsCount = await client.query('SELECT COUNT(*) FROM product_variations');
      result.totalVariations = parseInt(variationsCount.rows[0].count);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return result;
  }
}

