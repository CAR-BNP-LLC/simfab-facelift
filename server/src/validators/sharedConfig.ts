/**
 * Shared Config Validation Schemas
 * Joi validation schemas for shared product configuration requests
 */

import Joi from 'joi';

// ============================================================================
// SHARED CONFIG SCHEMAS
// ============================================================================

export const createSharedConfigSchema = Joi.object({
  productId: Joi.number().integer().positive().required(),
  configuration: Joi.object({
    modelVariationId: Joi.number().integer().positive().optional(),
    dropdownSelections: Joi.object().pattern(
      Joi.number().integer().positive(),
      Joi.number().integer().positive()
    ).optional(),
    variations: Joi.object().pattern(
      Joi.number().integer().positive(),
      Joi.number().integer().positive()
    ).optional(),
    bundleItems: Joi.object({
      selectedOptional: Joi.array().items(
        Joi.number().integer().positive()
      ).optional(),
      configurations: Joi.object().pattern(
        Joi.number().integer().positive(),
        Joi.object().pattern(
          Joi.number().integer().positive(),
          Joi.alternatives().try(
            Joi.number().integer(),
            Joi.string(),
            Joi.boolean()
          )
        )
      ).optional()
    }).optional()
  }).required()
});

