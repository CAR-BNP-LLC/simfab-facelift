# Phase 1: Database & Backend Foundation

## Overview
This phase establishes the database schema, TypeScript types, and validation schemas for the product description builder system.

## Implementation Steps

### 1. Create Database Migration

**File:** `server/src/migrations/sql/022_create_product_description_components.sql`

```sql
-- Create product description components table
-- Supports dynamic content creation with JSON storage

CREATE TABLE IF NOT EXISTS product_description_components (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  component_type VARCHAR(50) NOT NULL CHECK (component_type IN ('text', 'image', 'two_column', 'three_column', 'full_width_image')),
  content JSON NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_description_components_product_id ON product_description_components(product_id);
CREATE INDEX IF NOT EXISTS idx_product_description_components_sort_order ON product_description_components(product_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_product_description_components_type ON product_description_components(component_type);

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_description_components_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_description_components_updated_at
  BEFORE UPDATE ON product_description_components
  FOR EACH ROW
  EXECUTE FUNCTION update_product_description_components_updated_at();

-- Add table comment
COMMENT ON TABLE product_description_components IS 'Stores dynamic product description components with JSON content';
COMMENT ON COLUMN product_description_components.component_type IS 'Type of component: text, image, two_column, three_column, full_width_image';
COMMENT ON COLUMN product_description_components.content IS 'JSON content specific to component type';
COMMENT ON COLUMN product_description_components.sort_order IS 'Display order within product (lower numbers first)';
COMMENT ON COLUMN product_description_components.is_active IS 'Whether component is visible to customers';
```

### 2. Create TypeScript Types

**File:** `server/src/types/productDescription.ts`

```typescript
/**
 * Product Description Builder Types
 * Type definitions for dynamic product description components
 */

// ============================================================================
// BASE TYPES
// ============================================================================

export interface ProductDescriptionComponent {
  id: number;
  product_id: number;
  component_type: ComponentType;
  content: ComponentContent;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export type ComponentType = 'text' | 'image' | 'two_column' | 'three_column' | 'full_width_image';

// ============================================================================
// COMPONENT CONTENT TYPES
// ============================================================================

export interface Padding {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TextBlockContent {
  heading?: string;
  headingSize?: 'xl' | '2xl' | '3xl' | '4xl';
  headingColor?: string;
  paragraph?: string; // HTML string with inline styles
  textColor?: string; // Default text color
  alignment?: 'left' | 'center' | 'right';
  padding?: Padding;
}

export interface ImageBlockContent {
  imageUrl: string;
  altText?: string;
  caption?: string;
  width?: 'small' | 'medium' | 'large' | 'full';
  alignment?: 'left' | 'center' | 'right';
  padding?: Padding;
}

export interface TwoColumnContent {
  leftColumn: {
    type: 'text' | 'image';
    content: TextBlockContent | ImageBlockContent;
  };
  rightColumn: {
    type: 'text' | 'image';
    content: TextBlockContent | ImageBlockContent;
  };
  columnRatio?: '50-50' | '60-40' | '40-60';
  gap?: number;
  reverseOnMobile?: boolean;
  padding?: Padding;
}

export interface ThreeColumnItem {
  icon?: string;
  heading: string;
  text: string;
  iconColor?: string;
  textColor?: string;
}

export interface ThreeColumnContent {
  columns: [ThreeColumnItem, ThreeColumnItem, ThreeColumnItem];
  gap?: number;
  alignment?: 'left' | 'center' | 'right';
  backgroundColor?: string;
  padding?: Padding;
}

export interface FullWidthImageContent {
  imageUrl: string;
  altText?: string;
  caption?: string;
  height?: 'small' | 'medium' | 'large' | 'auto';
  padding?: Padding;
}

// Union type for all component content
export type ComponentContent = 
  | TextBlockContent 
  | ImageBlockContent 
  | TwoColumnContent 
  | ThreeColumnContent 
  | FullWidthImageContent;

// ============================================================================
// DTOs FOR API OPERATIONS
// ============================================================================

export interface CreateComponentDto {
  component_type: ComponentType;
  content: ComponentContent;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateComponentDto {
  component_type?: ComponentType;
  content?: ComponentContent;
  sort_order?: number;
  is_active?: boolean;
}

export interface ReorderComponentsDto {
  componentIds: number[];
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ComponentWithContent extends Omit<ProductDescriptionComponent, 'content'> {
  content: ComponentContent;
}

export interface GetComponentsResponse {
  success: boolean;
  data: ComponentWithContent[];
}

export interface CreateComponentResponse {
  success: boolean;
  data: ComponentWithContent;
  message: string;
}

export interface UpdateComponentResponse {
  success: boolean;
  data: ComponentWithContent;
  message: string;
}

export interface DeleteComponentResponse {
  success: boolean;
  message: string;
}

export interface ReorderComponentsResponse {
  success: boolean;
  message: string;
}
```

### 3. Create Validation Schemas

**File:** `server/src/validators/productDescription.ts`

```typescript
/**
 * Product Description Builder Validation Schemas
 * Zod schemas for validating component content and operations
 */

import { z } from 'zod';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const paddingSchema = z.object({
  top: z.number().min(0).max(100),
  bottom: z.number().min(0).max(100),
  left: z.number().min(0).max(100),
  right: z.number().min(0).max(100),
}).optional();

const colorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color');

const alignmentSchema = z.enum(['left', 'center', 'right']).optional();

// ============================================================================
// COMPONENT CONTENT SCHEMAS
// ============================================================================

const textBlockContentSchema = z.object({
  heading: z.string().max(200).optional(),
  headingSize: z.enum(['xl', '2xl', '3xl', '4xl']).optional(),
  headingColor: colorSchema.optional(),
  paragraph: z.string().max(5000).optional(),
  textColor: colorSchema.optional(),
  alignment: alignmentSchema,
  padding: paddingSchema,
});

const imageBlockContentSchema = z.object({
  imageUrl: z.string().url('Must be a valid URL').max(500),
  altText: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  width: z.enum(['small', 'medium', 'large', 'full']).optional(),
  alignment: alignmentSchema,
  padding: paddingSchema,
});

const twoColumnContentSchema = z.object({
  leftColumn: z.object({
    type: z.enum(['text', 'image']),
    content: z.union([textBlockContentSchema, imageBlockContentSchema]),
  }),
  rightColumn: z.object({
    type: z.enum(['text', 'image']),
    content: z.union([textBlockContentSchema, imageBlockContentSchema]),
  }),
  columnRatio: z.enum(['50-50', '60-40', '40-60']).optional(),
  gap: z.number().min(0).max(100).optional(),
  reverseOnMobile: z.boolean().optional(),
  padding: paddingSchema,
});

const threeColumnItemSchema = z.object({
  icon: z.string().max(500).optional(),
  heading: z.string().max(100),
  text: z.string().max(500),
  iconColor: colorSchema.optional(),
  textColor: colorSchema.optional(),
});

const threeColumnContentSchema = z.object({
  columns: z.tuple([threeColumnItemSchema, threeColumnItemSchema, threeColumnItemSchema]),
  gap: z.number().min(0).max(100).optional(),
  alignment: alignmentSchema,
  backgroundColor: colorSchema.optional(),
  padding: paddingSchema,
});

const fullWidthImageContentSchema = z.object({
  imageUrl: z.string().url('Must be a valid URL').max(500),
  altText: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  height: z.enum(['small', 'medium', 'large', 'auto']).optional(),
  padding: paddingSchema,
});

// Union schema for all component content types
const componentContentSchema = z.discriminatedUnion('component_type', [
  z.object({ component_type: z.literal('text'), content: textBlockContentSchema }),
  z.object({ component_type: z.literal('image'), content: imageBlockContentSchema }),
  z.object({ component_type: z.literal('two_column'), content: twoColumnContentSchema }),
  z.object({ component_type: z.literal('three_column'), content: threeColumnContentSchema }),
  z.object({ component_type: z.literal('full_width_image'), content: fullWidthImageContentSchema }),
]);

// ============================================================================
// API VALIDATION SCHEMAS
// ============================================================================

export const createComponentSchema = z.object({
  component_type: z.enum(['text', 'image', 'two_column', 'three_column', 'full_width_image']),
  content: componentContentSchema.shape.content,
  sort_order: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const updateComponentSchema = z.object({
  component_type: z.enum(['text', 'image', 'two_column', 'three_column', 'full_width_image']).optional(),
  content: componentContentSchema.shape.content.optional(),
  sort_order: z.number().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const reorderComponentsSchema = z.object({
  componentIds: z.array(z.number().positive()).min(1),
});

export const getComponentsParamsSchema = z.object({
  productId: z.string().transform((val) => parseInt(val, 10)).refine((val) => !isNaN(val) && val > 0, {
    message: 'Product ID must be a positive number',
  }),
});

export const componentIdParamsSchema = z.object({
  id: z.string().transform((val) => parseInt(val, 10)).refine((val) => !isNaN(val) && val > 0, {
    message: 'Component ID must be a positive number',
  }),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function validateComponentContent(type: string, content: any): boolean {
  try {
    const schema = componentContentSchema.shape.content;
    schema.parse(content);
    return true;
  } catch (error) {
    console.error('Component content validation failed:', error);
    return false;
  }
}

export function sanitizeHtmlContent(html: string): string {
  // Basic HTML sanitization - in production, use DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '');
}
```

## Testing Instructions

1. **Run Migration:**
   ```bash
   cd server
   npm run migrate
   ```

2. **Verify Table Creation:**
   ```sql
   \d product_description_components
   ```

3. **Test Type Definitions:**
   ```bash
   npm run build
   ```

4. **Test Validation Schemas:**
   ```bash
   npm run test -- --grep "productDescription"
   ```

## Next Steps

After completing Phase 1:
- Database table is ready for component storage
- TypeScript types ensure type safety
- Validation schemas prevent invalid data
- Ready to implement service layer in Phase 2

## Notes

- JSON content field allows flexible component structures
- Check constraints ensure valid component types
- Indexes optimize queries by product and sort order
- Rich text support via HTML strings with inline styles
- Validation includes HTML sanitization for security

