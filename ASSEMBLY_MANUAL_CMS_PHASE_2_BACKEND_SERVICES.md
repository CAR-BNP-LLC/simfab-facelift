# 📚 Assembly Manuals CMS - Phase 2: Backend Services

**Goal**: Create backend services for QR code generation and assembly manual management.

---

## 🎯 Overview

This phase focuses on:
- Installing required dependencies
- Creating QR Code Service for generating unique QR codes
- Creating Assembly Manual Service for CRUD operations
- Implementing product assignment logic
- Integrating with existing FileUploadService

---

## 📦 Dependencies

### Install Required Packages
```bash
cd server
npm install qrcode @types/qrcode
```

**Package Details:**
- `qrcode`: Generates QR codes as images or data URLs
- `@types/qrcode`: TypeScript type definitions

---

## 🔧 QR Code Service

### File: `server/src/services/QRCodeService.ts`

```typescript
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
        type: 'image/png',
        quality: 0.92,
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
```

---

## 📚 Assembly Manual Service

### File: `server/src/services/AssemblyManualService.ts`

```typescript
/**
 * Assembly Manual Service
 * Manages assembly manuals and their product assignments
 */

import { Pool } from 'pg';
import { ValidationError } from '../utils/errors';
import { QRCodeService } from './QRCodeService';

export interface AssemblyManual {
  id: number;
  name: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  thumbnail_url?: string;
  qr_code_url?: string;
  qr_code_data?: string;
  is_public: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
  assigned_products?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

export class AssemblyManualService {
  private pool: Pool;
  private qrCodeService: QRCodeService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.qrCodeService = new QRCodeService();
  }

  /**
   * Get all manuals (with optional filters)
   */
  async getAllManuals(filters?: {
    is_public?: boolean;
    product_id?: number;
  }): Promise<AssemblyManual[]> {
    let query = `
      SELECT 
        am.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', p.id,
              'name', p.name,
              'slug', p.slug
            )
          ) FILTER (WHERE p.id IS NOT NULL),
          '[]'
        ) as assigned_products
      FROM assembly_manuals_cms am
      LEFT JOIN product_assembly_manuals pam ON am.id = pam.manual_id
      LEFT JOIN products p ON pam.product_id = p.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (filters?.is_public !== undefined) {
      query += ` AND am.is_public = $${paramCount++}`;
      params.push(filters.is_public);
    }

    if (filters?.product_id) {
      query += ` AND EXISTS (
        SELECT 1 FROM product_assembly_manuals pam2 
        WHERE pam2.manual_id = am.id AND pam2.product_id = $${paramCount++}
      )`;
      params.push(filters.product_id);
    }

    query += `
      GROUP BY am.id
      ORDER BY am.sort_order ASC, am.created_at DESC
    `;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => ({
      ...row,
      assigned_products: row.assigned_products || []
    }));
  }

  /**
   * Get manual by ID
   */
  async getManualById(id: number, includeProducts: boolean = true): Promise<AssemblyManual | null> {
    let query = `
      SELECT am.*
      FROM assembly_manuals_cms am
      WHERE am.id = $1
    `;

    const result = await this.pool.query(query, [id]);
    if (result.rows.length === 0) return null;

    const manual = result.rows[0];

    if (includeProducts) {
      const productsQuery = `
        SELECT p.id, p.name, p.slug
        FROM products p
        JOIN product_assembly_manuals pam ON p.id = pam.product_id
        WHERE pam.manual_id = $1
        ORDER BY pam.sort_order ASC
      `;
      const productsResult = await this.pool.query(productsQuery, [id]);
      manual.assigned_products = productsResult.rows;
    }

    return manual;
  }

  /**
   * Create new manual
   */
  async createManual(data: {
    name: string;
    description?: string;
    file_url: string;
    file_type: string;
    file_size?: number;
    thumbnail_url?: string;
    is_public?: boolean;
    sort_order?: number;
  }): Promise<AssemblyManual> {
    // Generate temporary QR code (will regenerate with actual ID after insert)
    const tempId = Date.now();
    const tempQrCode = await this.qrCodeService.generateQRCode(tempId, data.name);

    const query = `
      INSERT INTO assembly_manuals_cms 
        (name, description, file_url, file_type, file_size, thumbnail_url, 
         qr_code_url, qr_code_data, is_public, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      data.name,
      data.description || null,
      data.file_url,
      data.file_type || 'pdf',
      data.file_size || null,
      data.thumbnail_url || null,
      tempQrCode.qr_code_url,
      tempQrCode.qr_code_data,
      data.is_public !== undefined ? data.is_public : true,
      data.sort_order || 0
    ];

    const result = await this.pool.query(query, values);
    const manual = result.rows[0];

    // Regenerate QR code with actual ID
    const updatedQrCode = await this.qrCodeService.regenerateQRCode(
      manual.id,
      manual.name,
      manual.qr_code_url
    );

    // Update manual with correct QR code
    await this.pool.query(
      `UPDATE assembly_manuals_cms 
       SET qr_code_url = $1, qr_code_data = $2 
       WHERE id = $3`,
      [updatedQrCode.qr_code_url, updatedQrCode.qr_code_data, manual.id]
    );

    manual.qr_code_url = updatedQrCode.qr_code_url;
    manual.qr_code_data = updatedQrCode.qr_code_data;

    return manual;
  }

  /**
   * Update manual
   */
  async updateManual(id: number, data: Partial<{
    name: string;
    description: string;
    thumbnail_url: string;
    is_public: boolean;
    sort_order: number;
  }>): Promise<AssemblyManual> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.thumbnail_url !== undefined) {
      updates.push(`thumbnail_url = $${paramCount++}`);
      values.push(data.thumbnail_url);
    }
    if (data.is_public !== undefined) {
      updates.push(`is_public = $${paramCount++}`);
      values.push(data.is_public);
    }
    if (data.sort_order !== undefined) {
      updates.push(`sort_order = $${paramCount++}`);
      values.push(data.sort_order);
    }

    if (updates.length === 0) {
      return this.getManualById(id) as Promise<AssemblyManual>;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE assembly_manuals_cms
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete manual
   */
  async deleteManual(id: number): Promise<void> {
    // Get manual to delete QR code
    const manual = await this.getManualById(id, false);
    if (manual?.qr_code_url) {
      await this.qrCodeService.deleteQRCode(manual.qr_code_url);
    }

    // Delete manual (cascade will handle product_assembly_manuals)
    await this.pool.query('DELETE FROM assembly_manuals_cms WHERE id = $1', [id]);
  }

  /**
   * Assign manual to products
   */
  async assignToProducts(manualId: number, productIds: number[]): Promise<void> {
    // Remove existing assignments
    await this.pool.query(
      'DELETE FROM product_assembly_manuals WHERE manual_id = $1',
      [manualId]
    );

    // Add new assignments
    if (productIds.length > 0) {
      const values: any[] = [];
      const placeholders: string[] = [];
      let paramCount = 1;

      productIds.forEach((productId, index) => {
        placeholders.push(`($${paramCount++}, $${paramCount++}, $${paramCount++})`);
        values.push(manualId, productId, index);
      });

      const query = `
        INSERT INTO product_assembly_manuals (manual_id, product_id, sort_order)
        VALUES ${placeholders.join(', ')}
      `;

      await this.pool.query(query, values);
    }
  }

  /**
   * Get manuals for a product
   */
  async getManualsForProduct(productId: number): Promise<AssemblyManual[]> {
    const query = `
      SELECT am.*
      FROM assembly_manuals_cms am
      JOIN product_assembly_manuals pam ON am.id = pam.manual_id
      WHERE pam.product_id = $1 AND am.is_public = true
      ORDER BY pam.sort_order ASC, am.sort_order ASC
    `;

    const result = await this.pool.query(query, [productId]);
    return result.rows;
  }

  /**
   * Regenerate QR code for a manual
   */
  async regenerateQRCode(manualId: number): Promise<{
    qr_code_url: string;
    qr_code_data: string;
  }> {
    const manual = await this.getManualById(manualId, false);
    if (!manual) {
      throw new ValidationError('Manual not found');
    }

    const qrCode = await this.qrCodeService.regenerateQRCode(
      manualId,
      manual.name,
      manual.qr_code_url
    );

    await this.pool.query(
      `UPDATE assembly_manuals_cms 
       SET qr_code_url = $1, qr_code_data = $2 
       WHERE id = $3`,
      [qrCode.qr_code_url, qrCode.qr_code_data, manualId]
    );

    return qrCode;
  }
}
```

---

## ✅ Testing Checklist

### QR Code Service
- [ ] Test QR code generation
- [ ] Verify QR code file is saved correctly
- [ ] Test QR code regeneration
- [ ] Test QR code deletion
- [ ] Verify QR code URL format is correct
- [ ] Test with different manual names (special characters)

### Assembly Manual Service
- [ ] Test `getAllManuals()` with no filters
- [ ] Test `getAllManuals()` with `is_public` filter
- [ ] Test `getAllManuals()` with `product_id` filter
- [ ] Test `getManualById()` with products included
- [ ] Test `getManualById()` without products
- [ ] Test `createManual()` - verify QR code generated
- [ ] Test `updateManual()` - partial updates
- [ ] Test `deleteManual()` - verify QR code deleted
- [ ] Test `assignToProducts()` - single product
- [ ] Test `assignToProducts()` - multiple products
- [ ] Test `assignToProducts()` - remove all assignments
- [ ] Test `getManualsForProduct()` - only public manuals
- [ ] Test `regenerateQRCode()` - creates new QR code

---

## 🔧 Integration Points

### FileUploadService
- Already supports PDF uploads via `getDocumentUploadMiddleware()`
- Returns file URL via `getFileUrl()`

### ProductService
- Will integrate in Phase 5 to fetch manuals for products
- Will call `getManualsForProduct()` when loading product details

---

## 🚨 Important Notes

1. **QR Code Directory**: Created automatically in `uploads/qr-codes/`
2. **QR Code URL Format**: `{FRONTEND_URL}/manuals/:id`
3. **Temporary QR Code**: Generated with temp ID first, then regenerated with actual ID after insert
4. **File Cleanup**: QR codes are deleted when manual is deleted
5. **Public Flag**: Only public manuals appear in `getManualsForProduct()`

---

## ✅ Phase 2 Completion Criteria

- [x] Dependencies installed
- [ ] QRCodeService created and tested
- [ ] AssemblyManualService created and tested
- [ ] All CRUD operations working
- [ ] Product assignment logic working
- [ ] QR code generation working
- [ ] Integration with FileUploadService verified

**Next Phase**: Phase 3 - Backend Controllers & Routes

