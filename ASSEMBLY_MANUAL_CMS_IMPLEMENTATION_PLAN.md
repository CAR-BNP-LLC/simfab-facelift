# 📚 Assembly Manuals CMS Implementation Plan

**Goal**: Create a comprehensive Content Management System for assembly manuals with PDF uploads, product assignments, public viewing, and unique QR codes for printing.

**Note**: This plan has been split into 6 detailed phase files for easier implementation. See the phase files below for step-by-step instructions.

---

## 📂 Phase Files

1. **[Phase 1: Database Schema & Migration](./ASSEMBLY_MANUAL_CMS_PHASE_1_DATABASE.md)** - Database tables and migration
2. **[Phase 2: Backend Services](./ASSEMBLY_MANUAL_CMS_PHASE_2_BACKEND_SERVICES.md)** - QR Code Service & Assembly Manual Service
3. **[Phase 3: Backend Controllers](./ASSEMBLY_MANUAL_CMS_PHASE_3_BACKEND_CONTROLLERS.md)** - HTTP controllers and routes
4. **[Phase 4: Admin Dashboard](./ASSEMBLY_MANUAL_CMS_PHASE_4_ADMIN_DASHBOARD.md)** - Admin UI for managing manuals
5. **[Phase 5: Public Integration](./ASSEMBLY_MANUAL_CMS_PHASE_5_PUBLIC_INTEGRATION.md)** - Public viewing page and product integration
6. **[Phase 6: Testing & Deployment](./ASSEMBLY_MANUAL_CMS_PHASE_6_TESTING_DEPLOYMENT.md)** - Testing checklist and deployment guide

---

## 🎯 Overview

This system will allow admins to:
- Upload PDF assembly manuals
- Manage manuals independently from products
- Assign any manual to any product(s)
- View manuals on the website
- Generate unique QR codes for each manual to include in product packages
- Print QR codes for packaging

---

## 📋 Current State vs. Required State

### Current Implementation:
- ✅ `assembly_manuals` table exists with `product_id` (one-to-many relationship)
- ✅ Manuals are displayed on product detail pages
- ✅ File upload service supports PDFs
- ✅ Basic manual display in `ProductAdditionalInfo` component

### Required Enhancements:
- 🔄 Change from one-to-many to many-to-many relationship (manuals can be assigned to multiple products)
- ➕ Create dedicated admin tab for manual management
- ➕ Add QR code generation for each manual
- ➕ Add public manual viewing page
- ➕ Add product assignment interface in admin
- ➕ Add QR code download/print functionality

---

## 🗄️ Database Schema Changes

### Phase 1: Create New Tables

#### 1.1 Refactor `assembly_manuals` Table
```sql
-- Migration: 045_refactor_assembly_manuals_for_cms.sql

-- Step 1: Create new structure
CREATE TABLE IF NOT EXISTS assembly_manuals_cms (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_url VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) DEFAULT 'pdf',
  file_size INTEGER,
  thumbnail_url VARCHAR(500), -- Preview image/thumbnail
  qr_code_url VARCHAR(500), -- QR code image URL
  qr_code_data TEXT, -- Encoded QR code data (URL to view manual)
  is_public BOOLEAN DEFAULT true, -- Can be viewed on website
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS product_assembly_manuals (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  manual_id INTEGER NOT NULL REFERENCES assembly_manuals_cms(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(product_id, manual_id) -- Prevent duplicate assignments
);

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_product_assembly_manuals_product_id 
  ON product_assembly_manuals(product_id);
CREATE INDEX IF NOT EXISTS idx_product_assembly_manuals_manual_id 
  ON product_assembly_manuals(manual_id);
CREATE INDEX IF NOT EXISTS idx_assembly_manuals_cms_public 
  ON assembly_manuals_cms(is_public) WHERE is_public = true;

-- Step 4: Migrate existing data (if any)
INSERT INTO assembly_manuals_cms (name, description, file_url, file_type, file_size, thumbnail_url, is_public, sort_order, created_at)
SELECT 
  name, 
  description, 
  file_url, 
  COALESCE(file_type, 'pdf'), 
  file_size, 
  image_url, 
  true, 
  sort_order, 
  created_at
FROM assembly_manuals
ON CONFLICT DO NOTHING;

INSERT INTO product_assembly_manuals (product_id, manual_id, sort_order, created_at)
SELECT 
  am.product_id, 
  amc.id, 
  am.sort_order, 
  am.created_at
FROM assembly_manuals am
JOIN assembly_manuals_cms amc ON am.file_url = amc.file_url
ON CONFLICT DO NOTHING;

-- Step 5: Add comments
COMMENT ON TABLE assembly_manuals_cms IS 'Central repository for assembly manuals';
COMMENT ON TABLE product_assembly_manuals IS 'Many-to-many relationship between products and assembly manuals';
COMMENT ON COLUMN assembly_manuals_cms.qr_code_url IS 'QR code image file URL for printing';
COMMENT ON COLUMN assembly_manuals_cms.qr_code_data IS 'URL encoded in QR code (e.g., https://simfab.com/manuals/:id)';
```

---

## 🔧 Backend Implementation

### Phase 2: Backend Services & Controllers

#### 2.1 Install Dependencies
```bash
cd server
npm install qrcode @types/qrcode
```

#### 2.2 Create QR Code Service
**File**: `server/src/services/QRCodeService.ts`
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

#### 2.3 Create Assembly Manual Service
**File**: `server/src/services/AssemblyManualService.ts`
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
    // Generate QR code
    const qrCode = await this.qrCodeService.generateQRCode(
      Date.now(), // Temporary ID, will update after insert
      data.name
    );

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
      qrCode.qr_code_url,
      qrCode.qr_code_data,
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

#### 2.4 Create Assembly Manual Controller
**File**: `server/src/controllers/assemblyManualController.ts`
```typescript
/**
 * Assembly Manual Controller
 * Handles HTTP requests for assembly manual management
 */

import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { AssemblyManualService } from '../services/AssemblyManualService';
import { FileUploadService } from '../services/FileUploadService';
import { successResponse, errorResponse } from '../utils/response';

export class AssemblyManualController {
  private service: AssemblyManualService;
  private fileUploadService: FileUploadService;

  constructor(pool: Pool) {
    this.service = new AssemblyManualService(pool);
    this.fileUploadService = new FileUploadService();
  }

  /**
   * GET /api/admin/assembly-manuals
   * List all manuals
   */
  getAllManuals = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { is_public, product_id } = req.query;
      
      const filters: any = {};
      if (is_public !== undefined) {
        filters.is_public = is_public === 'true';
      }
      if (product_id) {
        filters.product_id = parseInt(product_id as string);
      }

      const manuals = await this.service.getAllManuals(filters);
      res.json(successResponse(manuals));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/admin/assembly-manuals/:id
   * Get manual by ID
   */
  getManualById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const manual = await this.service.getManualById(id);
      
      if (!manual) {
        return res.status(404).json(errorResponse('Manual not found', 'NOT_FOUND'));
      }

      res.json(successResponse(manual));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/assembly-manuals
   * Create new manual
   */
  createManual = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json(errorResponse('PDF file is required', 'NO_FILE'));
      }

      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const fileUrl = this.fileUploadService.getFileUrl(file.filename, baseUrl);

      const manual = await this.service.createManual({
        name: req.body.name || file.originalname,
        description: req.body.description || null,
        file_url: fileUrl,
        file_type: 'pdf',
        file_size: file.size,
        thumbnail_url: req.body.thumbnail_url || null,
        is_public: req.body.is_public !== 'false',
        sort_order: parseInt(req.body.sort_order || '0')
      });

      // Assign to products if provided
      if (req.body.product_ids) {
        const productIds = Array.isArray(req.body.product_ids)
          ? req.body.product_ids.map((id: string) => parseInt(id))
          : [parseInt(req.body.product_ids)];
        await this.service.assignToProducts(manual.id, productIds);
      }

      const fullManual = await this.service.getManualById(manual.id);
      res.status(201).json(successResponse(fullManual, 'Manual created successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /api/admin/assembly-manuals/:id
   * Update manual
   */
  updateManual = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const manual = await this.service.updateManual(id, {
        name: req.body.name,
        description: req.body.description,
        thumbnail_url: req.body.thumbnail_url,
        is_public: req.body.is_public,
        sort_order: req.body.sort_order
      });

      res.json(successResponse(manual, 'Manual updated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * DELETE /api/admin/assembly-manuals/:id
   * Delete manual
   */
  deleteManual = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      await this.service.deleteManual(id);
      res.json(successResponse(null, 'Manual deleted successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/assembly-manuals/:id/assign-products
   * Assign manual to products
   */
  assignToProducts = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const { product_ids } = req.body;

      if (!Array.isArray(product_ids)) {
        return res.status(400).json(errorResponse('product_ids must be an array', 'INVALID_INPUT'));
      }

      await this.service.assignToProducts(id, product_ids);
      const manual = await this.service.getManualById(id);
      res.json(successResponse(manual, 'Products assigned successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/admin/assembly-manuals/:id/regenerate-qr
   * Regenerate QR code
   */
  regenerateQR = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const qrCode = await this.service.regenerateQRCode(id);
      res.json(successResponse(qrCode, 'QR code regenerated successfully'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /api/manuals/:id
   * Public endpoint to view manual (for QR code scanning)
   */
  getPublicManual = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const manual = await this.service.getManualById(id, false);
      
      if (!manual) {
        return res.status(404).json(errorResponse('Manual not found', 'NOT_FOUND'));
      }

      if (!manual.is_public) {
        return res.status(403).json(errorResponse('Manual is not publicly accessible', 'NOT_PUBLIC'));
      }

      res.json(successResponse(manual));
    } catch (error) {
      next(error);
    }
  };
}
```

#### 2.5 Create Routes
**File**: `server/src/routes/admin/assemblyManuals.ts`
```typescript
import { Router } from 'express';
import { Pool } from 'pg';
import { AssemblyManualController } from '../../controllers/assemblyManualController';
import { FileUploadService } from '../../services/FileUploadService';
import { requireAuth } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';

export const createAdminAssemblyManualRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AssemblyManualController(pool);
  const fileUploadService = new FileUploadService();

  // All routes require authentication and admin role
  router.use(requireAuth);
  router.use(requireRole('admin'));

  router.get('/', controller.getAllManuals);
  router.get('/:id', controller.getManualById);
  router.post(
    '/',
    fileUploadService.getDocumentUploadMiddleware().single('file'),
    controller.createManual
  );
  router.put('/:id', controller.updateManual);
  router.delete('/:id', controller.deleteManual);
  router.post('/:id/assign-products', controller.assignToProducts);
  router.post('/:id/regenerate-qr', controller.regenerateQR);

  return router;
};
```

**File**: `server/src/routes/assemblyManuals.ts` (Public routes)
```typescript
import { Router } from 'express';
import { Pool } from 'pg';
import { AssemblyManualController } from '../controllers/assemblyManualController';

export const createAssemblyManualRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AssemblyManualController(pool);

  // Public route for viewing manuals (QR code links)
  router.get('/:id', controller.getPublicManual);

  return router;
};
```

#### 2.6 Register Routes in Main Server File
**File**: `server/src/index.ts` (add to existing routes)
```typescript
// Add to imports
import { createAdminAssemblyManualRoutes } from './routes/admin/assemblyManuals';
import { createAssemblyManualRoutes } from './routes/assemblyManuals';

// Add to route registration
app.use('/api/admin/assembly-manuals', createAdminAssemblyManualRoutes(pool));
app.use('/api/manuals', createAssemblyManualRoutes(pool));
```

---

## 🎨 Frontend Implementation

### Phase 3: Admin Dashboard Tab

#### 3.1 Add Tab to Admin Dashboard
**File**: `src/pages/Admin.tsx`
```typescript
// Add to imports
import { FileText } from 'lucide-react';

// Add to TabsList (around line 996)
<TabsTrigger value="assembly-manuals" className="flex items-center gap-2">
  <FileText className="h-4 w-4" />
  <span className="hidden sm:inline">Assembly Manuals</span>
</TabsTrigger>

// Add TabsContent for assembly manuals
<TabsContent value="assembly-manuals">
  <AssemblyManualsManagement />
</TabsContent>
```

#### 3.2 Create Assembly Manuals Management Component
**File**: `src/components/admin/AssemblyManualsManagement.tsx`
```typescript
import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Download, QrCode, Search, Filter, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { API_URL } from '@/config';

interface AssemblyManual {
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
  assigned_products?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

interface Product {
  id: number;
  name: string;
  slug: string;
}

const AssemblyManualsManagement = () => {
  const [manuals, setManuals] = useState<AssemblyManual[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingManual, setEditingManual] = useState<AssemblyManual | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: true,
    sort_order: 0
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchManuals();
    fetchProducts();
  }, []);

  const fetchManuals = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/assembly-manuals`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setManuals(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch manuals:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/products`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const handleCreate = () => {
    setEditingManual(null);
    setFormData({
      name: '',
      description: '',
      is_public: true,
      sort_order: 0
    });
    setSelectedProducts([]);
    setFile(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (manual: AssemblyManual) => {
    setEditingManual(manual);
    setFormData({
      name: manual.name,
      description: manual.description || '',
      is_public: manual.is_public,
      sort_order: manual.sort_order
    });
    setSelectedProducts(manual.assigned_products?.map(p => p.id) || []);
    setFile(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('is_public', formData.is_public.toString());
      formDataToSend.append('sort_order', formData.sort_order.toString());

      if (file) {
        formDataToSend.append('file', file);
      }

      if (selectedProducts.length > 0) {
        selectedProducts.forEach(id => {
          formDataToSend.append('product_ids[]', id.toString());
        });
      }

      const url = editingManual
        ? `${API_URL}/api/admin/assembly-manuals/${editingManual.id}`
        : `${API_URL}/api/admin/assembly-manuals`;

      const method = editingManual ? 'PUT' : 'POST';

      let response;
      if (!editingManual && file) {
        // Create with file upload
        response = await fetch(url, {
          method: 'POST',
          credentials: 'include',
          body: formDataToSend
        });
      } else if (editingManual) {
        // Update without file
        response = await fetch(url, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        // Assign products separately
        if (selectedProducts.length > 0) {
          await fetch(`${API_URL}/api/admin/assembly-manuals/${editingManual.id}/assign-products`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_ids: selectedProducts })
          });
        }
      } else {
        throw new Error('File is required for new manuals');
      }

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: editingManual ? 'Manual updated' : 'Manual created'
        });
        setIsDialogOpen(false);
        fetchManuals();
      } else {
        throw new Error(data.error?.message || 'Operation failed');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Operation failed',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this manual?')) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/assembly-manuals/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Manual deleted'
        });
        fetchManuals();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete manual',
        variant: 'destructive'
      });
    }
  };

  const handleRegenerateQR = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/assembly-manuals/${id}/regenerate-qr`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'QR code regenerated'
        });
        fetchManuals();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate QR code',
        variant: 'destructive'
      });
    }
  };

  const filteredManuals = manuals.filter(manual =>
    manual.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    manual.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Assembly Manuals</h2>
          <p className="text-muted-foreground">Manage assembly manuals and their product assignments</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Manual
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search manuals..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Manuals List */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredManuals.map((manual) => (
            <Card key={manual.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{manual.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(manual)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(manual.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {manual.description && (
                  <p className="text-sm text-muted-foreground">{manual.description}</p>
                )}

                <div className="flex gap-2 flex-wrap">
                  {manual.assigned_products?.map((product) => (
                    <Badge key={product.id} variant="secondary">
                      {product.name}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(manual.file_url, '_blank')}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    View PDF
                  </Button>
                  {manual.qr_code_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(manual.qr_code_url, '_blank')}
                      className="flex-1"
                    >
                      <QrCode className="w-4 h-4 mr-2" />
                      QR Code
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRegenerateQR(manual.id)}
                  >
                    <QrCode className="w-4 h-4" />
                  </Button>
                </div>

                <div className="text-xs text-muted-foreground">
                  {manual.is_public ? (
                    <Badge variant="outline" className="text-green-600">Public</Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600">Private</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingManual ? 'Edit Manual' : 'Upload New Manual'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Manual Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            {!editingManual && (
              <div>
                <Label htmlFor="file">PDF File *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required={!editingManual}
                />
              </div>
            )}

            <div>
              <Label>Assign to Products</Label>
              <div className="max-h-48 overflow-y-auto border rounded p-2 space-y-2">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`product-${product.id}`}
                      checked={selectedProducts.includes(product.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedProducts([...selectedProducts, product.id]);
                        } else {
                          setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`product-${product.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {product.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_public: checked as boolean })
                }
              />
              <label htmlFor="is_public" className="text-sm cursor-pointer">
                Make publicly viewable (for QR code scanning)
              </label>
            </div>

            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Processing...' : editingManual ? 'Update' : 'Upload'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssemblyManualsManagement;
```

#### 3.3 Update Product Service to Include Manuals
**File**: `server/src/services/ProductService.ts`
- Update `getProductBySlug` method to include assembly manuals using the new service

```typescript
// Add to getProductBySlug method
const assemblyManuals = await assemblyManualService.getManualsForProduct(product.id);
```

---

### Phase 4: Public Manual Viewing Page

#### 4.1 Create Manual Viewing Page
**File**: `src/pages/ManualView.tsx`
```typescript
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Download, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { API_URL } from '@/config';

const ManualView = () => {
  const { id } = useParams();
  const [manual, setManual] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchManual();
    }
  }, [id]);

  const fetchManual = async () => {
    try {
      const response = await fetch(`${API_URL}/api/manuals/${id}`, {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setManual(data.data);
      } else {
        setError(data.error?.message || 'Manual not found');
      }
    } catch (error) {
      setError('Failed to load manual');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !manual) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 mt-20">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Manual Not Found</h1>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 mt-20">
        <div className="mb-6">
          <Button variant="ghost" asChild>
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Link>
          </Button>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-card rounded-lg p-6 mb-6">
            <h1 className="text-3xl font-bold mb-2">{manual.name}</h1>
            {manual.description && (
              <p className="text-muted-foreground mb-4">{manual.description}</p>
            )}
            <Button
              onClick={() => window.open(manual.file_url, '_blank')}
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF Manual
            </Button>
          </div>

          <div className="bg-card rounded-lg p-6">
            <iframe
              src={manual.file_url}
              className="w-full h-screen min-h-[600px] border-0 rounded"
              title={manual.name}
            />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ManualView;
```

#### 4.2 Add Route
**File**: `src/App.tsx`
```typescript
import ManualView from './pages/ManualView';

// Add route
<Route path="/manuals/:id" element={<ManualView />} />
```

---

### Phase 5: Update Product Detail Page

#### 5.1 Update ProductAdditionalInfo Component
**File**: `src/components/ProductAdditionalInfo.tsx`
- Update to use new manual structure and add "View Online" button

```typescript
// Update AssemblyManual interface
interface AssemblyManual {
  id: number;
  name: string;
  image?: string;
  fileUrl: string;
  viewUrl?: string; // Add view URL for online viewing
}

// Update render to include view button
<Button
  variant="outline"
  size="sm"
  className="w-full mb-2"
  onClick={() => window.open(manual.viewUrl || `/manuals/${manual.id}`, '_blank')}
>
  <Eye className="w-4 h-4 mr-2" />
  View Online
</Button>
<Button
  variant="outline"
  size="sm"
  className="w-full"
  onClick={() => window.open(manual.fileUrl, '_blank')}
>
  <Download className="w-4 h-4 mr-2" />
  Download Manual
</Button>
```

---

## 📦 Additional Features

### Phase 6: Enhanced QR Code Features

#### 6.1 QR Code Print Template
Create a printable QR code page with product info:

**File**: `src/pages/QRCodePrint.tsx`
```typescript
// Printable page for QR codes with product information
// Can be accessed via: /admin/assembly-manuals/:id/print-qr
```

#### 6.2 QR Code Generation Options
- Size options (small, medium, large)
- Include product name on QR code label
- Batch print multiple QR codes

---

## ✅ Testing Checklist

### Backend Testing
- [ ] Create manual via POST `/api/admin/assembly-manuals`
- [ ] List all manuals via GET `/api/admin/assembly-manuals`
- [ ] Get manual by ID via GET `/api/admin/assembly-manuals/:id`
- [ ] Update manual via PUT `/api/admin/assembly-manuals/:id`
- [ ] Delete manual via DELETE `/api/admin/assembly-manuals/:id`
- [ ] Assign manual to products via POST `/api/admin/assembly-manuals/:id/assign-products`
- [ ] Regenerate QR code via POST `/api/admin/assembly-manuals/:id/regenerate-qr`
- [ ] View public manual via GET `/api/manuals/:id`
- [ ] Get manuals for product (in ProductService)

### Frontend Testing
- [ ] Access Assembly Manuals tab in admin dashboard
- [ ] Upload new PDF manual
- [ ] Assign manual to multiple products
- [ ] Edit manual details
- [ ] Delete manual
- [ ] View/download PDF
- [ ] Download/print QR code
- [ ] Regenerate QR code
- [ ] View manual on product detail page
- [ ] Click "View Online" button
- [ ] Scan QR code and view manual page
- [ ] Test public manual viewing page

### Integration Testing
- [ ] Manual appears on assigned product detail pages
- [ ] QR code links to correct manual page
- [ ] QR code can be scanned and opens correct URL
- [ ] Manual visibility respects `is_public` flag
- [ ] Manual deletion removes from all products
- [ ] File cleanup on manual deletion

---

## 🚀 Deployment Considerations

### Environment Variables
```env
FRONTEND_URL=https://simfab.com  # For QR code URLs
```

### File Storage
- Ensure `uploads/` and `uploads/qr-codes/` directories are writable
- Consider cloud storage (S3) for production
- Implement file cleanup cron job

### Database Migration
- Run migration `045_refactor_assembly_manuals_for_cms.sql`
- Migrate existing `assembly_manuals` data if needed
- Test migration on staging first

### Security
- Admin routes protected by authentication and RBAC
- Public routes only return manuals with `is_public = true`
- File upload validation (PDF only, size limits)
- SQL injection protection (parameterized queries)

---

## 📝 Implementation Order

Follow the phase files in order:

1. **Phase 1**: Database migration → [See Phase 1 file](./ASSEMBLY_MANUAL_CMS_PHASE_1_DATABASE.md)
2. **Phase 2**: Backend services → [See Phase 2 file](./ASSEMBLY_MANUAL_CMS_PHASE_2_BACKEND_SERVICES.md)
3. **Phase 3**: Backend controllers and routes → [See Phase 3 file](./ASSEMBLY_MANUAL_CMS_PHASE_3_BACKEND_CONTROLLERS.md)
4. **Phase 4**: Admin dashboard UI → [See Phase 4 file](./ASSEMBLY_MANUAL_CMS_PHASE_4_ADMIN_DASHBOARD.md)
5. **Phase 5**: Public viewing and product integration → [See Phase 5 file](./ASSEMBLY_MANUAL_CMS_PHASE_5_PUBLIC_INTEGRATION.md)
6. **Phase 6**: Testing and deployment → [See Phase 6 file](./ASSEMBLY_MANUAL_CMS_PHASE_6_TESTING_DEPLOYMENT.md)

---

## 🎯 Success Criteria

✅ Admins can upload PDF manuals  
✅ Admins can assign manuals to any product(s)  
✅ Manuals appear on product detail pages  
✅ Each manual has a unique QR code  
✅ QR codes can be downloaded/printed  
✅ Scanning QR code opens manual viewing page  
✅ Manuals can be viewed online on the website  
✅ Manuals can be managed independently of products  

---

## 📚 Additional Notes

- The QR code contains a URL like: `https://simfab.com/manuals/:id`
- QR codes are regenerated when manual details change (optional feature)
- Manuals can be assigned to multiple products simultaneously
- Old `assembly_manuals` table can be kept for backward compatibility during migration
- Consider adding manual categories/tags for better organization
- Consider adding version control for manual updates

