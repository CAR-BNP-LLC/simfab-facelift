/**
 * QR Code Service
 * Generates unique QR codes for assembly manuals
 */

import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs/promises';
import { ValidationError } from '../utils/errors';

export class QRCodeService {
  private qrCodesDir: string;
  private baseUrl: string;

  constructor() {
    this.qrCodesDir = path.join(process.cwd(), 'uploads', 'qr-codes');
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    this.ensureDirectory();
  }

  /**
   * Ensure QR codes directory exists
   */
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.access(this.qrCodesDir);
    } catch {
      await fs.mkdir(this.qrCodesDir, { recursive: true });
    }
  }

  /**
   * Generate QR code for a manual
   * @param manualId - The manual ID
   * @param manualName - Manual name for file naming
   * @returns Object with qr_code_url and qr_code_data
   */
  async generateQRCode(manualId: number, manualName: string): Promise<{
    qr_code_url: string;
    qr_code_data: string;
  }> {
    try {
      // Generate URL for manual viewing
      const manualUrl = `${this.baseUrl}/manuals/${manualId}`;
      
      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(manualUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 300
      });

      // Generate filename
      const safeName = manualName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50);
      const filename = `manual-${manualId}-${safeName}-${Date.now()}.png`;
      const filePath = path.join(this.qrCodesDir, filename);

      // Extract base64 data and save to file
      const base64Data = qrCodeDataUrl.replace(/^data:image\/\w+;base64,/, '');
      await fs.writeFile(filePath, base64Data, 'base64');

      // Return URLs
      const qrCodeUrl = `/uploads/qr-codes/${filename}`;
      
      return {
        qr_code_url: qrCodeUrl,
        qr_code_data: manualUrl
      };
    } catch (error) {
      throw new ValidationError('Failed to generate QR code', { error });
    }
  }

  /**
   * Regenerate QR code (update existing)
   */
  async regenerateQRCode(manualId: number, manualName: string, oldQrCodeUrl?: string): Promise<{
    qr_code_url: string;
    qr_code_data: string;
  }> {
    // Delete old QR code if exists
    if (oldQrCodeUrl) {
      await this.deleteQRCode(oldQrCodeUrl);
    }

    // Generate new QR code
    return this.generateQRCode(manualId, manualName);
  }

  /**
   * Delete QR code file
   */
  async deleteQRCode(qrCodeUrl: string): Promise<void> {
    try {
      if (!qrCodeUrl) return;
      
      const filename = path.basename(qrCodeUrl);
      const filePath = path.join(this.qrCodesDir, filename);
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Error deleting QR code:', error);
      // Don't throw - file might not exist
    }
  }
}

