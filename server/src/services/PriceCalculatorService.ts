/**
 * Price Calculator Service
 * Handles dynamic price calculation for configurable products
 */

import { Pool } from 'pg';
import { ProductConfiguration, PriceCalculation, PriceBreakdown } from '../types/product';
import { ValidationError, NotFoundError } from '../utils/errors';

export class PriceCalculatorService {
  constructor(private pool: Pool) {}

  /**
   * Calculate total price for a product configuration
   */
  async calculatePrice(
    productId: number,
    configuration: ProductConfiguration,
    quantity: number = 1
  ): Promise<PriceCalculation> {
    try {
      // Validate product exists and get base price
      const product = await this.getProductBasePrice(productId);
      if (!product) {
        throw new NotFoundError('Product', { productId });
      }

      let totalPrice = product.regular_price;
      const variationAdjustments: Array<{ name: string; amount: number }> = [];
      let addonsTotal = 0;
      let colorAdjustment = 0;

      // 1. Calculate color adjustment (usually $0, but supports custom pricing)
      if (configuration.colorId) {
        const colorPrice = await this.getColorAdjustment(configuration.colorId);
        if (colorPrice !== null) {
          colorAdjustment = colorPrice;
          totalPrice += colorPrice;
        }
      }

      // 2. Calculate model variation adjustment
      if (configuration.modelVariationId) {
        const modelAdjustment = await this.getVariationOptionPrice(configuration.modelVariationId);
        if (modelAdjustment) {
          totalPrice += modelAdjustment.price_adjustment;
          variationAdjustments.push({
            name: modelAdjustment.option_name,
            amount: modelAdjustment.price_adjustment
          });
        }
      }

      // 3. Calculate dropdown variations adjustments
      if (configuration.dropdownSelections) {
        const dropdownIds = Object.values(configuration.dropdownSelections);
        const dropdownAdjustments = await this.getVariationOptionsPrices(dropdownIds);

        for (const adjustment of dropdownAdjustments) {
          totalPrice += adjustment.price_adjustment;
          variationAdjustments.push({
            name: adjustment.option_name,
            amount: adjustment.price_adjustment
          });
        }
      }

      // 4. Calculate add-ons total
      if (configuration.addons && configuration.addons.length > 0) {
        for (const addon of configuration.addons) {
          let addonPrice = 0;

          if (addon.optionId) {
            // Addon with specific option selected
            const addonOption = await this.getAddonOptionPrice(addon.optionId);
            if (addonOption) {
              addonPrice = addonOption.price;
            }
          } else {
            // Addon without options (uses base price)
            const addonBase = await this.getAddonBasePrice(addon.addonId);
            if (addonBase) {
              addonPrice = addonBase.base_price || 0;
            }
          }

          addonsTotal += addonPrice;
          totalPrice += addonPrice;
        }
      }

      // 5. Validate required variations are selected
      await this.validateRequiredVariations(productId, configuration);

      // 6. Calculate final totals
      const subtotal = totalPrice;
      const total = subtotal * quantity;

      const breakdown: PriceBreakdown = {
        basePrice: product.regular_price,
        colorAdjustment: colorAdjustment > 0 ? colorAdjustment : undefined,
        variationAdjustments,
        addonsTotal,
        subtotal,
        quantity,
        total,
        currency: 'USD'
      };

      const calculation: PriceCalculation = {
        pricing: breakdown,
        breakdown: {
          base: product.regular_price,
          variations: variationAdjustments.reduce((sum, v) => sum + v.amount, 0),
          addons: addonsTotal
        }
      };

      return calculation;
    } catch (error) {
      if (error instanceof NotFoundError || error instanceof ValidationError) {
        throw error;
      }
      console.error('Error calculating price:', error);
      throw error;
    }
  }

  /**
   * Validate product configuration completeness
   */
  async validateConfiguration(
    productId: number,
    configuration: ProductConfiguration
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // Check required variations
      const requiredVariations = await this.getRequiredVariations(productId);

      for (const variation of requiredVariations) {
        if (variation.variation_type === 'model') {
          if (!configuration.modelVariationId) {
            errors.push(`Model variation "${variation.name}" is required`);
          }
        } else if (variation.variation_type === 'dropdown') {
          if (!configuration.dropdownSelections || !configuration.dropdownSelections[variation.id]) {
            errors.push(`Dropdown variation "${variation.name}" is required`);
          }
        }
      }

      // Check required add-ons
      const requiredAddons = await this.getRequiredAddons(productId);
      const selectedAddonIds = (configuration.addons || []).map(a => a.addonId);

      for (const addon of requiredAddons) {
        if (!selectedAddonIds.includes(addon.id)) {
          errors.push(`Add-on "${addon.name}" is required`);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      console.error('Error validating configuration:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private async getProductBasePrice(productId: number) {
    const sql = `
      SELECT id, regular_price, sale_price, type
      FROM products
      WHERE id = $1 AND status = 'active'
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows[0] || null;
  }

  private async getColorAdjustment(colorId: number): Promise<number | null> {
    const sql = `
      SELECT color_name
      FROM product_colors
      WHERE id = $1 AND is_available = true
    `;

    const result = await this.pool.query(sql, [colorId]);
    
    // Currently colors don't have price adjustments, but structure supports it
    // Return 0 for now, can be extended later
    return result.rows.length > 0 ? 0 : null;
  }

  private async getVariationOptionPrice(optionId: number) {
    const sql = `
      SELECT option_name, price_adjustment
      FROM variation_options
      WHERE id = $1
    `;

    const result = await this.pool.query(sql, [optionId]);
    return result.rows[0] || null;
  }

  private async getVariationOptionsPrices(optionIds: number[]) {
    if (optionIds.length === 0) return [];

    const sql = `
      SELECT option_name, price_adjustment
      FROM variation_options
      WHERE id = ANY($1)
    `;

    const result = await this.pool.query(sql, [optionIds]);
    return result.rows;
  }

  private async getAddonOptionPrice(optionId: number) {
    const sql = `
      SELECT price, name
      FROM addon_options
      WHERE id = $1 AND is_available = true
    `;

    const result = await this.pool.query(sql, [optionId]);
    return result.rows[0] || null;
  }

  private async getAddonBasePrice(addonId: number) {
    const sql = `
      SELECT base_price
      FROM product_addons
      WHERE id = $1
    `;

    const result = await this.pool.query(sql, [addonId]);
    return result.rows[0] || null;
  }

  private async getRequiredVariations(productId: number) {
    const sql = `
      SELECT id, name, variation_type
      FROM product_variations
      WHERE product_id = $1 AND is_required = true
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }

  private async getRequiredAddons(productId: number) {
    const sql = `
      SELECT id, name
      FROM product_addons
      WHERE product_id = $1 AND is_required = true
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows;
  }

  private async validateRequiredVariations(
    productId: number,
    configuration: ProductConfiguration
  ): Promise<void> {
    const validation = await this.validateConfiguration(productId, configuration);

    if (!validation.valid) {
      throw new ValidationError('Invalid product configuration', {
        errors: validation.errors
      });
    }
  }

  /**
   * Get price range for a product based on all possible configurations
   */
  async getProductPriceRange(productId: number): Promise<{ min: number; max: number }> {
    try {
      const product = await this.getProductBasePrice(productId);
      if (!product) {
        throw new NotFoundError('Product', { productId });
      }

      let minPrice = product.regular_price;
      let maxPrice = product.regular_price;

      // Get all variation adjustments
      const variationsSql = `
        SELECT COALESCE(MIN(vo.price_adjustment), 0) as min_adj,
               COALESCE(MAX(vo.price_adjustment), 0) as max_adj
        FROM product_variations v
        JOIN variation_options vo ON vo.variation_id = v.id
        WHERE v.product_id = $1
      `;

      const variationsResult = await this.pool.query(variationsSql, [productId]);
      const variationsData = variationsResult.rows[0];

      minPrice += variationsData.min_adj || 0;
      maxPrice += variationsData.max_adj || 0;

      // Get all addon prices
      const addonsSql = `
        SELECT COALESCE(MIN(price), 0) as min_price,
               COALESCE(MAX(price), 0) as max_price
        FROM addon_options ao
        JOIN product_addons pa ON pa.id = ao.addon_id
        WHERE pa.product_id = $1 AND ao.is_available = true
      `;

      const addonsResult = await this.pool.query(addonsSql, [productId]);
      const addonsData = addonsResult.rows[0];

      // Max price includes all optional addons
      maxPrice += addonsData.max_price || 0;

      return {
        min: Math.round(minPrice * 100) / 100,
        max: Math.round(maxPrice * 100) / 100
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      console.error('Error getting price range:', error);
      throw error;
    }
  }

  /**
   * Calculate savings if product has sale price
   */
  async calculateSavings(productId: number): Promise<{ hasSale: boolean; savings: number; percentage: number } | null> {
    const sql = `
      SELECT regular_price, sale_price, sale_start_date, sale_end_date
      FROM products
      WHERE id = $1
    `;

    const result = await this.pool.query(sql, [productId]);
    const product = result.rows[0];

    if (!product || !product.sale_price) {
      return null;
    }

    // Check if sale is active
    const now = new Date();
    const saleActive =
      (!product.sale_start_date || new Date(product.sale_start_date) <= now) &&
      (!product.sale_end_date || new Date(product.sale_end_date) >= now);

    if (!saleActive) {
      return null;
    }

    const savings = product.regular_price - product.sale_price;
    const percentage = (savings / product.regular_price) * 100;

    return {
      hasSale: true,
      savings: Math.round(savings * 100) / 100,
      percentage: Math.round(percentage)
    };
  }
}

