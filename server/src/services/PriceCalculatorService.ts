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
      console.log('========== PRICE CALCULATOR: STARTING CALCULATION ==========');
      console.log('Product ID:', productId);
      console.log('Quantity:', quantity);
      console.log('Original Configuration:', JSON.stringify(configuration, null, 2));
      
      // Normalize configuration to ensure proper types
      configuration = this.normalizeConfiguration(configuration);
      console.log('Normalized Configuration:', JSON.stringify(configuration, null, 2));
      
      // Validate product exists and get base price
      const product = await this.getProductBasePrice(productId);
      if (!product) {
        throw new NotFoundError('Product', { productId });
      }

      let totalPrice = Number(product.regular_price) || 0;
      console.log('Base Product Price:', product.regular_price, '→', totalPrice);
      
      const variationAdjustments: Array<{ name: string; amount: number }> = [];
      let addonsTotal = 0;
      let colorAdjustment = 0;

      // 1. Calculate color adjustment (usually $0, but supports custom pricing)
      if (configuration.colorId) {
        const colorPrice = await this.getColorAdjustment(configuration.colorId);
        if (colorPrice !== null) {
          colorAdjustment = Number(colorPrice) || 0;
          totalPrice += colorAdjustment;
        }
      }

      // 2. Calculate model variation adjustment
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
        console.log('--- Processing Variations (New System) ---');
        console.log('Variations Object:', JSON.stringify(configuration.variations, null, 2));
        const variationIds = Object.keys(configuration.variations).map(id => parseInt(id));
        const selectedOptionIds = Object.values(configuration.variations);
        console.log('Variation IDs:', variationIds);
        console.log('Selected Option IDs:', selectedOptionIds);
        
        // Get all variation options for the selected variations
        const variationsSql = `
          SELECT vo.id, vo.option_name, vo.price_adjustment, v.name as variation_name
          FROM variation_options vo
          JOIN product_variations v ON v.id = vo.variation_id
          WHERE vo.id = ANY($1)
        `;
        
        const variationsResult = await this.pool.query(variationsSql, [selectedOptionIds]);
        console.log('Variation Options Found in DB:', variationsResult.rows.length);
        
        for (const option of variationsResult.rows) {
          const adjustment = Number(option.price_adjustment) || 0;
          console.log(`  - ${option.variation_name}: ${option.option_name} = $${adjustment}`);
          totalPrice += adjustment;
          variationAdjustments.push({
            name: `${option.variation_name}: ${option.option_name}`,
            amount: adjustment
          });
        }
        console.log('Price after variations:', totalPrice);
      } else {
        console.log('No variations found in configuration');
      }

      // 4. Calculate add-ons total
      if (configuration.addons && configuration.addons.length > 0) {
        console.log('--- Processing Addons ---');
        console.log('Addons Count:', configuration.addons.length);
        for (const addon of configuration.addons) {
          let addonPrice = 0;

          if (addon.optionId) {
            console.log(`  - Processing addon ${addon.addonId} with option ${addon.optionId}`);
            const addonOption = await this.getAddonOptionPrice(addon.optionId);
            if (addonOption) {
              addonPrice = Number(addonOption.price) || 0;
              console.log(`    Option price: $${addonPrice}`);
            } else {
              console.log(`    ⚠️  Option not found!`);
            }
          } else {
            console.log(`  - Processing addon ${addon.addonId} (base price)`);
            const addonBase = await this.getAddonBasePrice(addon.addonId);
            if (addonBase) {
              addonPrice = Number(addonBase.base_price) || 0;
              console.log(`    Base price: $${addonPrice}`);
            } else {
              console.log(`    ⚠️  Addon not found!`);
            }
          }

          addonsTotal += addonPrice;
          totalPrice += addonPrice;
          console.log(`  - Addon total so far: $${addonsTotal}, Overall price: $${totalPrice}`);
        }
        console.log('Final Addons Total:', addonsTotal);
      } else {
        console.log('No addons found in configuration');
      }

      // 4.5. Calculate bundle items (required adjustments + optional items)
      let requiredBundleAdjustments = 0;
      let optionalBundleTotal = 0;
      
      if (configuration.bundleItems) {
        console.log('--- Processing Bundle Items ---');
        console.log('Bundle Items Config:', JSON.stringify(configuration.bundleItems, null, 2));
        
        // Get all bundle items for this product
        const bundleItemsSql = `
          SELECT bi.*, p.regular_price as item_product_price
          FROM product_bundle_items bi
          JOIN products p ON p.id = bi.item_product_id
          WHERE bi.bundle_product_id = $1
        `;
        const bundleItemsResult = await this.pool.query(bundleItemsSql, [productId]);
        const allBundleItems = bundleItemsResult.rows;
        console.log('All Bundle Items Found:', allBundleItems.length);
        
        // Process required items - only variation adjustments, no base price
        const requiredItems = allBundleItems.filter((item: any) => item.item_type === 'required');
        console.log('Required Bundle Items:', requiredItems.length);
        for (const item of requiredItems) {
          console.log(`  - Processing required item ${item.id} (product ${item.item_product_id})`);
          if (item.is_configurable && configuration.bundleItems.configurations?.[item.id]) {
            const config = configuration.bundleItems.configurations[item.id];
            console.log(`    Has configuration:`, JSON.stringify(config, null, 2));
            
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
                    console.log(`      Required dropdown adjustment: $${adj} (${selectedOption.option_name}) - Total: $${requiredBundleAdjustments}`);
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
                    console.log(`      Required boolean adjustment: $${adj} (Yes) - Total: $${requiredBundleAdjustments}`);
                  }
                }
              }
            }
          } else {
            console.log(`    No configuration for this item`);
          }
        }
        console.log('Total Required Bundle Adjustments:', requiredBundleAdjustments);
        
        // Process optional items - base price + variations
        const optionalItemIds = configuration.bundleItems.selectedOptional || [];
        console.log('Optional Bundle Items Selected:', optionalItemIds.length, 'IDs:', optionalItemIds);
        for (const itemId of optionalItemIds) {
          console.log(`  - Processing optional item ${itemId}`);
          const item = allBundleItems.find((b: any) => b.id === itemId && b.item_type === 'optional');
          if (!item) {
            console.log(`    ⚠️  Item ${itemId} not found!`);
            continue;
          }
          
          const basePrice = Number(item.item_product_price) || 0;
          console.log(`    Base price: $${basePrice}`);
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
            console.log(`    Found ${variationsResult.rows.length} variations for this bundle item`);
            
            for (const variation of variationsResult.rows) {
              const varIdNum = variation.id;
              const varIdStr = String(varIdNum);
              
              // Check both string and number keys in config
              const configValue = config[varIdNum] ?? config[varIdStr];
              
              console.log(`      Checking variation ${varIdNum} (${variation.variation_type}): config value =`, configValue);
              
              if (variation.variation_type === 'dropdown' && configValue !== undefined && configValue !== null) {
                // Handle dropdown - value should be optionId (number)
                const optionId = typeof configValue === 'string' ? parseInt(configValue, 10) : configValue;
                if (!isNaN(optionId)) {
                  const selectedOption = variation.options.find((opt: any) => opt.id === optionId);
                  if (selectedOption) {
                    const adj = Number(selectedOption.price_adjustment) || 0;
                    variationAdjustments += adj;
                    console.log(`        Dropdown adjustment: $${adj} (${selectedOption.option_name})`);
                  } else {
                    console.log(`        ⚠️  Option ${optionId} not found for variation ${varIdNum}`);
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
                    console.log(`        Boolean adjustment: $${adj} (Yes)`);
                  } else {
                    console.log(`        ⚠️  "Yes" option not found for boolean variation ${varIdNum}`);
                  }
                } else {
                  console.log(`        Boolean variation ${varIdNum} is false/No (no adjustment)`);
                }
              }
            }
          }
          
          const itemTotal = basePrice + variationAdjustments;
          optionalBundleTotal += itemTotal;
          console.log(`    Item total: $${itemTotal} (Base: $${basePrice} + Variations: $${variationAdjustments})`);
          console.log(`    Optional bundle total so far: $${optionalBundleTotal}`);
        }
        console.log('Final Optional Bundle Total:', optionalBundleTotal);
      } else {
        console.log('No bundle items in configuration');
      }
      
      console.log('Adding bundle adjustments to price...');
      console.log('  Required adjustments:', requiredBundleAdjustments);
      console.log('  Optional total:', optionalBundleTotal);
      totalPrice += requiredBundleAdjustments + optionalBundleTotal;
      console.log('Price after bundle items:', totalPrice);

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
          requiredBundleAdjustments,
          optionalBundleTotal,
          addons: addonsTotal
        }
      };

      console.log('--- Final Calculation Summary ---');
      console.log('Base Price:', product.regular_price);
      console.log('Variation Adjustments:', variationAdjustments);
      console.log('Variation Adjustments Total:', variationAdjustments.reduce((sum, v) => sum + v.amount, 0));
      console.log('Required Bundle Adjustments:', requiredBundleAdjustments);
      console.log('Optional Bundle Total:', optionalBundleTotal);
      console.log('Addons Total:', addonsTotal);
      console.log('Final Subtotal:', subtotal);
      console.log('Final Total (quantity × subtotal):', total);
      console.log('====================================================');

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

