/**
 * Product Description Builder Validation Schemas
 * Joi validation schemas for product description component operations
 */

import Joi from 'joi';

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const paddingSchema = Joi.object({
  top: Joi.number().min(0).max(100).optional(),
  bottom: Joi.number().min(0).max(100).optional(),
  left: Joi.number().min(0).max(100).optional(),
  right: Joi.number().min(0).max(100).optional(),
}).optional().allow(null);

const colorSchema = Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color').optional();

const alignmentSchema = Joi.string().valid('left', 'center', 'right').optional();

// ============================================================================
// COMPONENT CONTENT SCHEMAS
// ============================================================================

const textBlockContentSchema = Joi.object({
  heading: Joi.string().max(200).optional(),
  headingSize: Joi.string().valid('xl', '2xl', '3xl', '4xl').optional(),
  headingColor: colorSchema,
  paragraph: Joi.string().max(5000).optional(),
  textColor: colorSchema,
  alignment: alignmentSchema,
  padding: paddingSchema,
});

const imageBlockContentSchema = Joi.object({
  imageUrl: Joi.string().uri().max(500).required(),
  altText: Joi.string().max(200).optional(),
  caption: Joi.string().max(500).optional(),
  width: Joi.string().valid('small', 'medium', 'large', 'full').optional(),
  alignment: alignmentSchema,
  padding: paddingSchema,
});

const twoColumnContentSchema = Joi.object({
  leftColumn: Joi.object({
    type: Joi.string().valid('text', 'image').required(),
    content: Joi.alternatives().try(textBlockContentSchema, imageBlockContentSchema).required(),
  }).required(),
  rightColumn: Joi.object({
    type: Joi.string().valid('text', 'image').required(),
    content: Joi.alternatives().try(textBlockContentSchema, imageBlockContentSchema).required(),
  }).required(),
  columnRatio: Joi.string().valid('50-50', '60-40', '40-60').optional(),
  gap: Joi.number().min(0).max(100).optional(),
  reverseOnMobile: Joi.boolean().optional(),
  padding: paddingSchema,
});

const threeColumnItemSchema = Joi.object({
  icon: Joi.string().max(500).optional(),
  heading: Joi.string().max(100).required(),
  text: Joi.string().max(500).required(),
  iconColor: colorSchema,
  textColor: colorSchema,
});

const threeColumnContentSchema = Joi.object({
  columns: Joi.array().items(threeColumnItemSchema).length(3).required(),
  gap: Joi.number().min(0).max(100).optional(),
  alignment: alignmentSchema,
  backgroundColor: colorSchema,
  padding: paddingSchema,
});

const fullWidthImageContentSchema = Joi.object({
  imageUrl: Joi.string().uri().max(500).required(),
  altText: Joi.string().max(200).optional(),
  caption: Joi.string().max(500).optional(),
  height: Joi.string().valid('small', 'medium', 'large', 'auto').optional(),
  padding: paddingSchema,
});

// Union schema for all component content types
const componentContentSchema = Joi.alternatives().try(
  textBlockContentSchema,
  imageBlockContentSchema,
  twoColumnContentSchema,
  threeColumnContentSchema,
  fullWidthImageContentSchema
);

// ============================================================================
// API VALIDATION SCHEMAS
// ============================================================================

export const createComponentSchema = Joi.object({
  component_type: Joi.string().valid('text', 'image', 'two_column', 'three_column', 'full_width_image').required(),
  content: componentContentSchema.required(),
  sort_order: Joi.number().min(0).optional(),
  is_active: Joi.boolean().optional(),
});

export const updateComponentSchema = Joi.object({
  component_type: Joi.string().valid('text', 'image', 'two_column', 'three_column', 'full_width_image').optional(),
  content: componentContentSchema.optional(),
  sort_order: Joi.number().min(0).optional(),
  is_active: Joi.boolean().optional(),
}).min(1); // At least one field to update

export const reorderComponentsSchema = Joi.object({
  componentIds: Joi.array().items(Joi.number().integer().positive()).min(1).required()
});

export const getComponentsParamsSchema = Joi.object({
  productId: Joi.string().pattern(/^\d+$/).required()
});

export const componentIdParamsSchema = Joi.object({
  id: Joi.string().pattern(/^\d+$/).required()
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function validateComponentContent(type: string, content: any): boolean {
  try {
    const schema = componentContentSchema;
    const { error } = schema.validate(content);
    if (error) {
      console.error('Component content validation failed:', error);
      console.error('Validation error details:', error.details);
      console.error('Content being validated:', JSON.stringify(content, null, 2));
      return false;
    }
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