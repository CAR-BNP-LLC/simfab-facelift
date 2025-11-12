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
      // Normalize configuration to ensure proper types
      configuration = this.normalizeConfiguration(configuration);
      // Validate product exists and get base price
      const product = await this.getProductBasePrice(productId);
      if (!product) {
        throw new NotFoundError('Product', { productId });
      }

      let totalPrice = Number(product.regular_price) || 0;
      
      const variationAdjustments: Array<{ name: string; amount: number }> = [];

      // 1. Calculate model variation adjustment
      if (configuration.modelVariationId) {
        const modelAdjustment = await this.getVariationOptionPrice(configuration.modelVariationId);
        if (modelAdjustment) {
          const adjustment = Number(modelAdjustment.price_adjustment) || 0;
          totalPrice += adjustment;
          variationAdjustments.push({
            name: modelAdjustment.option_name,
            amount: adjustment
          });
        }
      }

      // 3. Calculate dropdown variations adjustments
      if (configuration.dropdownSelections) {
        const dropdownIds = Object.values(configuration.dropdownSelections);
        const dropdownAdjustments = await this.getVariationOptionsPrices(dropdownIds);

        for (const adjustment of dropdownAdjustments) {
          const adjAmount = Number(adjustment.price_adjustment) || 0;
          totalPrice += adjAmount;
          variationAdjustments.push({
            name: adjustment.option_name,
            amount: adjAmount
          });
        }
      }

      // 3.5. Calculate new variations system adjustments
      if (configuration.variations && Object.keys(configuration.variations).length > 0) {
        const variationIds = Object.keys(configuration.variations).map(id => parseInt(id));
        const selectedOptionIds = Object.values(configuration.variations);
        
        // Get all variation options for the selected variations
        const variationsSql = `
          SELECT vo.id, vo.option_name, vo.price_adjustment, v.name as variation_name
          FROM variation_options vo
          JOIN product_variations v ON v.id = vo.variation_id
          WHERE vo.id = ANY($1)
        `;
        
        const variationsResult = await this.pool.query(variationsSql, [selectedOptionIds]);
        
        for (const option of variationsResult.rows) {
          const adjustment = Number(option.price_adjustment) || 0;
          totalPrice += adjustment;
          variationAdjustments.push({
            name: `${option.variation_name}: ${option.option_name}`,
            amount: adjustment
          });
        }
      }

      // 4. Calculate bundle items (required adjustments + optional items)
      let requiredBundleAdjustments = 0;
      let optionalBundleTotal = 0;
      
      if (configuration.bundleItems) {
        // Get all bundle items for this product
        const bundleItemsSql = `
          SELECT bi.*, p.regular_price as item_product_price
          FROM product_bundle_items bi
          JOIN products p ON p.id = bi.item_product_id
          WHERE bi.bundle_product_id = $1
        `;
        const bundleItemsResult = await this.pool.query(bundleItemsSql, [productId]);
        const allBundleItems = bundleItemsResult.rows;
        
        // Process required items - only variation adjustments, no base price
        const requiredItems = allBundleItems.filter((item: any) => item.item_type === 'required');
        for (const item of requiredItems) {
          if (item.is_configurable && configuration.bundleItems.configurations?.[item.id]) {
            const config = configuration.bundleItems.configurations[item.id];
            
            // Get variations for this bundle item
            const variationsSql = `
              SELECT v.*, 
                COALESCE(
                  (SELECT json_agg(json_build_object(
                    'id', vo.id,
                    'option_name', vo.option_name,
                    'price_adjustment', vo.price_adjustment,
                    'is_default', vo.is_default,
                    'sort_order', vo.sort_order
                  ) ORDER BY vo.sort_order)
                  FROM variation_options vo WHERE vo.variation_id = v.id),
                  '[]'::json
                ) as options
              FROM product_variations v
              WHERE v.product_id = $1 AND v.variation_type IN ('dropdown', 'boolean')
              ORDER BY v.sort_order
            `;
            const variationsResult = await this.pool.query(variationsSql, [item.item_product_id]);
            
            for (const variation of variationsResult.rows) {
              const varIdNum = variation.id;
              const varIdStr = String(varIdNum);
              
              // Check both string and number keys in config
              const configValue = config[varIdNum] ?? config[varIdStr];
              
              if (variation.variation_type === 'dropdown' && configValue !== undefined && configValue !== null) {
                // Handle dropdown - value should be optionId (number)
                const optionId = typeof configValue === 'string' ? parseInt(configValue, 10) : configValue;
                if (!isNaN(optionId)) {
                  const selectedOption = variation.options.find((opt: any) => opt.id === optionId);
                  if (selectedOption) {
                    const adj = Number(selectedOption.price_adjustment) || 0;
                    requiredBundleAdjustments += adj;
                  }
                }
              } else if (variation.variation_type === 'boolean') {
                // Handle boolean - value should be true/false (or truthy for "Yes")
                const isYes = configValue === true || configValue === 'true' || configValue === 1;
                if (isYes) {
                  const yesOption = variation.options.find((opt: any) => opt.option_name === 'Yes');
                  if (yesOption) {
                    const adj = Number(yesOption.price_adjustment) || 0;
                    requiredBundleAdjustments += adj;
                  }
                }
              }
            }
          }
        }
        
        // Process optional items - base price + variations
        const optionalItemIds = configuration.bundleItems.selectedOptional || [];
        for (const itemId of optionalItemIds) {
          const item = allBundleItems.find((b: any) => b.id === itemId && b.item_type === 'optional');
          if (!item) {
            continue;
          }
          
          const basePrice = Number(item.item_product_price) || 0;
          let variationAdjustments = 0;
          
          if (item.is_configurable && configuration.bundleItems.configurations?.[item.id]) {
            const config = configuration.bundleItems.configurations[item.id];
            
            // Get variations for this bundle item
            const variationsSql = `
              SELECT v.*, 
                COALESCE(
                  (SELECT json_agg(json_build_object(
                    'id', vo.id,
                    'option_name', vo.option_name,
                    'price_adjustment', vo.price_adjustment,
                    'is_default', vo.is_default,
                    'sort_order', vo.sort_order
                  ) ORDER BY vo.sort_order)
                  FROM variation_options vo WHERE vo.variation_id = v.id),
                  '[]'::json
                ) as options
              FROM product_variations v
              WHERE v.product_id = $1 AND v.variation_type IN ('dropdown', 'boolean')
              ORDER BY v.sort_order
            `;
            const variationsResult = await this.pool.query(variationsSql, [item.item_product_id]);
            
            for (const variation of variationsResult.rows) {
              const varIdNum = variation.id;
              const varIdStr = String(varIdNum);
              
              // Check both string and number keys in config
              const configValue = config[varIdNum] ?? config[varIdStr];

              if (variation.variation_type === 'dropdown' && configValue !== undefined && configValue !== null) {
                // Handle dropdown - value should be optionId (number)
                const optionId = typeof configValue === 'string' ? parseInt(configValue, 10) : configValue;
                if (!isNaN(optionId)) {
                  const selectedOption = variation.options.find((opt: any) => opt.id === optionId);
                  if (selectedOption) {
                    const adj = Number(selectedOption.price_adjustment) || 0;
                    variationAdjustments += adj;
                  }
                }
              } else if (variation.variation_type === 'boolean') {
                // Handle boolean - value should be true/false (or truthy for "Yes")
                const isYes = configValue === true || configValue === 'true' || configValue === 1;
                if (isYes) {
                  const yesOption = variation.options.find((opt: any) => opt.option_name === 'Yes');
                  if (yesOption) {
                    const adj = Number(yesOption.price_adjustment) || 0;
                    variationAdjustments += adj;
                  }
                }
              }
            }
          }
          
          const itemTotal = basePrice + variationAdjustments;
          optionalBundleTotal += itemTotal;
        }
      }
      
      totalPrice += requiredBundleAdjustments + optionalBundleTotal;

      // 5. Validate required variations are selected
      // Note: We validate but don't block price calculation - validation errors will be shown but price is still calculated
      // Full validation will happen when adding to cart
      try {
        await this.validateRequiredVariations(productId, configuration);
      } catch (validationError) {
        // Log validation error but continue with price calculation
        // The frontend should handle showing validation messages
      }

      // 6. Calculate final totals
      const subtotal = totalPrice;
      const total = subtotal * quantity;
      

      const breakdown: PriceBreakdown = {
        basePrice: product.regular_price,
        variationAdjustments,
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
          requiredBundleAdjustments,
          optionalBundleTotal
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
          // Check both old format (dropdownSelections) and new format (variations)
          const inOldFormat = configuration.dropdownSelections && configuration.dropdownSelections[variation.id];
          const inNewFormat = configuration.variations && configuration.variations[variation.id];
          if (!inOldFormat && !inNewFormat) {
            errors.push(`Dropdown variation "${variation.name}" is required`);
          }
        } else if (variation.variation_type === 'image') {
          // Check if image variation is selected (in variations object)
          if (!configuration.variations || !configuration.variations[variation.id]) {
            errors.push(`Image variation "${variation.name}" is required`);
          }
        } else if (variation.variation_type === 'boolean') {
          // Check if boolean variation is selected (in variations object)
          if (!configuration.variations || configuration.variations[variation.id] === undefined) {
            errors.push(`Boolean variation "${variation.name}" is required`);
          }
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

  /**
   * Normalize configuration to ensure variation IDs are numbers
   * Handles cases where JSON parsing returns string keys
   */
  private normalizeConfiguration(config: ProductConfiguration): ProductConfiguration {
    const normalized = { ...config };
    
    // Normalize variations object keys (convert string keys to numbers)
    if (normalized.variations) {
      const normalizedVariations: Record<number, number> = {};
      for (const [key, value] of Object.entries(normalized.variations)) {
        const numKey = typeof key === 'string' ? parseInt(key, 10) : key;
        const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
        if (!isNaN(numKey) && !isNaN(numValue)) {
          normalizedVariations[numKey] = numValue;
        }
      }
      normalized.variations = normalizedVariations;
    }
    
    // Normalize dropdownSelections if present
    if (normalized.dropdownSelections) {
      const normalizedDropdown: Record<number, number> = {};
      for (const [key, value] of Object.entries(normalized.dropdownSelections)) {
        const numKey = typeof key === 'string' ? parseInt(key, 10) : key;
        const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
        if (!isNaN(numKey) && !isNaN(numValue)) {
          normalizedDropdown[numKey] = numValue;
        }
      }
      normalized.dropdownSelections = normalizedDropdown;
    }
    
    // Normalize bundle items configurations
    if (normalized.bundleItems?.configurations) {
      const normalizedBundleConfigs: Record<number, any> = {};
      for (const [bundleItemId, bundleConfig] of Object.entries(normalized.bundleItems.configurations)) {
        const numBundleItemId = typeof bundleItemId === 'string' ? parseInt(bundleItemId, 10) : bundleItemId;
        if (!isNaN(numBundleItemId)) {
          // Normalize the bundle item's variation configuration
          // Values can be: number (optionId for dropdown), string (text value), or boolean
          const normalizedBundleVariations: Record<number, any> = {};
          if (bundleConfig && typeof bundleConfig === 'object') {
            for (const [varId, value] of Object.entries(bundleConfig)) {
              const numVarId = typeof varId === 'string' ? parseInt(varId, 10) : (typeof varId === 'number' ? varId : NaN);
              if (!isNaN(numVarId) && typeof numVarId === 'number') {
                // Preserve the original value type - can be number, string, or boolean
                normalizedBundleVariations[numVarId] = value;
              }
            }
          }
          normalizedBundleConfigs[numBundleItemId] = normalizedBundleVariations;
        }
      }
      normalized.bundleItems = {
        ...normalized.bundleItems,
        configurations: normalizedBundleConfigs,
        selectedOptional: normalized.bundleItems.selectedOptional?.map(id => 
          typeof id === 'string' ? parseInt(id, 10) : id
        )
      };
    }
    
    return normalized;
  }

  private async getProductBasePrice(productId: number) {
    const sql = `
      SELECT id, regular_price, sale_price, type
      FROM products
      WHERE id = $1 AND status = 'active'
    `;

    const result = await this.pool.query(sql, [productId]);
    return result.rows[0] || null;
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

  private async getRequiredVariations(productId: number) {
    const sql = `
      SELECT id, name, variation_type
      FROM product_variations
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

