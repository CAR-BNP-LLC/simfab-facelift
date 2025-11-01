/**
 * File Upload Service
 * Handles file uploads with validation and storage
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { ValidationError } from '../utils/errors';

export class FileUploadService {
  private uploadsDir: string;
  private maxFileSize: number = 5 * 1024 * 1024; // 5MB
  private allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  private allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    this.ensureUploadDirectory();
  }

  /**
   * Ensure upload directory exists
   */
  private async ensureUploadDirectory(): Promise<void> {
    try {
      await fs.access(this.uploadsDir);
    } catch {
      await fs.mkdir(this.uploadsDir, { recursive: true });
    }
  }

  /**
   * Get Multer storage configuration
   */
  private getStorage(): multer.StorageEngine {
    return multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadsDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
        cb(null, `${cleanName}-${uniqueSuffix}${ext}`);
      }
    });
  }

  /**
   * Validate file type
   */
  private validateFileType(file: Express.Multer.File, allowedTypes: string[]): void {
    if (!allowedTypes.includes(file.mimetype)) {
      throw new ValidationError(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`, {
        receivedType: file.mimetype
      });
    }
  }

  /**
   * Get image upload middleware
   */
  getImageUploadMiddleware(): multer.Multer {
    return multer({
      storage: this.getStorage(),
      limits: {
        fileSize: this.maxFileSize
      },
      fileFilter: (req, file, cb) => {
        try {
          this.validateFileType(file, this.allowedImageTypes);
          cb(null, true);
        } catch (error) {
          cb(error as Error);
        }
      }
    });
  }

  /**
   * Get CSV upload middleware (memory storage)
   */
  getCSVUploadMiddleware(): multer.Multer {
    return multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB for CSV files
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain'];
        const allowedExtensions = ['.csv'];
        const ext = path.extname(file.originalname).toLowerCase();
        
        if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new ValidationError('Invalid file type. Only CSV files are allowed.'));
        }
      }
    });
  }

  /**
   * Get document upload middleware
   */
  getDocumentUploadMiddleware(): multer.Multer {
    return multer({
      storage: this.getStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB for documents
      },
      fileFilter: (req, file, cb) => {
        try {
          this.validateFileType(file, this.allowedDocTypes);
          cb(null, true);
        } catch (error) {
          cb(error as Error);
        }
      }
    });
  }

  /**
   * Delete file from disk
   */
  async deleteFile(filename: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadsDir, filename);
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
      // Don't throw - file might already be deleted
    }
  }

  /**
   * Get file URL
   */
  getFileUrl(filename: string, baseUrl: string = ''): string {
    return `${baseUrl}/uploads/${filename}`;
  }

  /**
   * Get file path
   */
  getFilePath(filename: string): string {
    return path.join(this.uploadsDir, filename);
  }

  /**
   * Check if file exists
   */
  async fileExists(filename: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(filename);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file size
   */
  async getFileSize(filename: string): Promise<number> {
    try {
      const filePath = this.getFilePath(filename);
      const stats = await fs.stat(filePath);
      return stats.size;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }

  /**
   * Validate image dimensions (optional - requires image processing library)
   */
  validateImageDimensions(width: number, height: number): void {
    const maxWidth = 5000;
    const maxHeight = 5000;

    if (width > maxWidth || height > maxHeight) {
      throw new ValidationError(
        `Image dimensions too large. Maximum: ${maxWidth}x${maxHeight}px`,
        { width, height }
      );
    }
  }

  /**
   * Generate thumbnail (placeholder - would use sharp or similar in production)
   */
  async generateThumbnail(filename: string): Promise<string> {
    // TODO: Implement with sharp library
    // For now, just return original filename
    return filename;
  }

  /**
   * Clean up old files (run periodically)
   */
  async cleanupOldFiles(daysOld: number = 30): Promise<number> {
    try {
      const files = await fs.readdir(this.uploadsDir);
      const now = Date.now();
      const maxAge = daysOld * 24 * 60 * 60 * 1000;
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.uploadsDir, file);
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          // Check if file is referenced in database before deleting
          // TODO: Add database check
          // For now, just delete
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      return 0;
    }
  }
}

