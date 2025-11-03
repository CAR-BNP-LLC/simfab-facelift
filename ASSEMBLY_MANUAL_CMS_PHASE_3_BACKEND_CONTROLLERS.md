# 📚 Assembly Manuals CMS - Phase 3: Backend Controllers & Routes

**Goal**: Create HTTP controllers and routes for admin and public access to assembly manuals.

---

## 🎯 Overview

This phase focuses on:
- Creating Assembly Manual Controller with all endpoints
- Setting up admin routes (protected)
- Setting up public routes (for QR code scanning)
- Integrating file upload middleware
- Registering routes in main server file

---

## 🎮 Controller Implementation

### File: `server/src/controllers/assemblyManualController.ts`

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
   * List all manuals (admin only)
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
   * Get manual by ID (admin only)
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
   * Create new manual (admin only)
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
   * Update manual (admin only)
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
   * Delete manual (admin only)
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
   * Assign manual to products (admin only)
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
   * Regenerate QR code (admin only)
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

---

## 🛣️ Routes Implementation

### Admin Routes
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

  // List all manuals
  router.get('/', controller.getAllManuals);

  // Get manual by ID
  router.get('/:id', controller.getManualById);

  // Create new manual (with file upload)
  router.post(
    '/',
    fileUploadService.getDocumentUploadMiddleware().single('file'),
    controller.createManual
  );

  // Update manual
  router.put('/:id', controller.updateManual);

  // Delete manual
  router.delete('/:id', controller.deleteManual);

  // Assign manual to products
  router.post('/:id/assign-products', controller.assignToProducts);

  // Regenerate QR code
  router.post('/:id/regenerate-qr', controller.regenerateQR);

  return router;
};
```

### Public Routes
**File**: `server/src/routes/assemblyManuals.ts`

```typescript
import { Router } from 'express';
import { Pool } from 'pg';
import { AssemblyManualController } from '../controllers/assemblyManualController';

export const createAssemblyManualRoutes = (pool: Pool): Router => {
  const router = Router();
  const controller = new AssemblyManualController(pool);

  // Public route for viewing manuals (QR code links)
  // No authentication required, but manual must be public
  router.get('/:id', controller.getPublicManual);

  return router;
};
```

---

## 🔌 Register Routes in Main Server

### File: `server/src/index.ts`

Add the following to your existing route registrations:

```typescript
// Add to imports at top of file
import { createAdminAssemblyManualRoutes } from './routes/admin/assemblyManuals';
import { createAssemblyManualRoutes } from './routes/assemblyManuals';

// Add with other route registrations (usually after other admin routes)
app.use('/api/admin/assembly-manuals', createAdminAssemblyManualRoutes(pool));
app.use('/api/manuals', createAssemblyManualRoutes(pool));
```

**Example location** (add near other admin routes):
```typescript
// Existing admin routes
app.use('/api/admin/products', createAdminProductRoutes(pool));
app.use('/api/admin/orders', createAdminOrderRoutes(pool));
// ... other admin routes

// Add these new routes
app.use('/api/admin/assembly-manuals', createAdminAssemblyManualRoutes(pool));
app.use('/api/manuals', createAssemblyManualRoutes(pool));
```

---

## 📋 API Endpoints Summary

### Admin Endpoints (Protected)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/assembly-manuals` | List all manuals (with optional filters) |
| GET | `/api/admin/assembly-manuals/:id` | Get manual by ID |
| POST | `/api/admin/assembly-manuals` | Create new manual (upload PDF) |
| PUT | `/api/admin/assembly-manuals/:id` | Update manual details |
| DELETE | `/api/admin/assembly-manuals/:id` | Delete manual |
| POST | `/api/admin/assembly-manuals/:id/assign-products` | Assign manual to products |
| POST | `/api/admin/assembly-manuals/:id/regenerate-qr` | Regenerate QR code |

### Public Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/manuals/:id` | View public manual (for QR code scanning) |

---

## 🔒 Security Considerations

### Admin Routes
- Protected by `requireAuth` middleware (user must be logged in)
- Protected by `requireRole('admin')` middleware (user must have admin role)
- File upload validated (PDF only, size limits via FileUploadService)

### Public Routes
- No authentication required
- Manual must have `is_public = true` to be accessible
- Returns 403 if manual is private

---

## 📝 Request/Response Examples

### Create Manual (POST /api/admin/assembly-manuals)
**Request:**
```typescript
FormData {
  file: <PDF File>,
  name: "Assembly Guide v2.0",
  description: "Complete assembly instructions",
  is_public: "true",
  sort_order: "0",
  product_ids: ["1", "2", "3"] // Optional, can also assign later
}
```

**Response:**
```json
{
  "success": true,
  "message": "Manual created successfully",
  "data": {
    "id": 1,
    "name": "Assembly Guide v2.0",
    "file_url": "/uploads/manual-123.pdf",
    "qr_code_url": "/uploads/qr-codes/manual-1-Assembly-Guide-1234567890.png",
    "qr_code_data": "http://localhost:5173/manuals/1",
    "assigned_products": [...]
  }
}
```

### Assign Products (POST /api/admin/assembly-manuals/:id/assign-products)
**Request:**
```json
{
  "product_ids": [1, 2, 3]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Products assigned successfully",
  "data": {
    "id": 1,
    "assigned_products": [
      { "id": 1, "name": "Product 1", "slug": "product-1" },
      { "id": 2, "name": "Product 2", "slug": "product-2" }
    ]
  }
}
```

### View Public Manual (GET /api/manuals/:id)
**Request:**
```
GET /api/manuals/1
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Assembly Guide v2.0",
    "file_url": "/uploads/manual-123.pdf",
    "description": "Complete assembly instructions",
    "is_public": true
  }
}
```

---

## ✅ Testing Checklist

### Admin Endpoints
- [ ] GET `/api/admin/assembly-manuals` - List all
- [ ] GET `/api/admin/assembly-manuals?is_public=true` - Filter by public
- [ ] GET `/api/admin/assembly-manuals?product_id=1` - Filter by product
- [ ] GET `/api/admin/assembly-manuals/:id` - Get by ID
- [ ] POST `/api/admin/assembly-manuals` - Create with file upload
- [ ] PUT `/api/admin/assembly-manuals/:id` - Update
- [ ] DELETE `/api/admin/assembly-manuals/:id` - Delete
- [ ] POST `/api/admin/assembly-manuals/:id/assign-products` - Assign products
- [ ] POST `/api/admin/assembly-manuals/:id/regenerate-qr` - Regenerate QR

### Public Endpoints
- [ ] GET `/api/manuals/:id` - View public manual
- [ ] GET `/api/manuals/:id` - Test private manual (should return 403)

### Security Tests
- [ ] Admin endpoints require authentication
- [ ] Admin endpoints require admin role
- [ ] Public endpoints accessible without auth
- [ ] Private manuals not accessible via public endpoint

---

## ✅ Phase 3 Completion Criteria

- [x] Controller created with all methods
- [ ] Admin routes created and protected
- [ ] Public routes created
- [ ] Routes registered in main server file
- [ ] File upload middleware integrated
- [ ] All endpoints tested
- [ ] Security verified

**Next Phase**: Phase 4 - Admin Dashboard Frontend

