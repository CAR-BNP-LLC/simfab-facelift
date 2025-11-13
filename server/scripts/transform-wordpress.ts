/**
 * WordPress to Our System CSV Transformer
 * 
 * Transforms WordPress/WooCommerce CSV exports to our CSV import format
 * 
 * Features:
 * - Groups variable products with their variations
 * - Uses OpenAI to infer attribute values from variations
 * - Calculates price adjustments per option
 * - Uses minimum stock per option (Option C)
 */

import * as fs from 'fs';
import * as path from 'path';
import csv from 'csv-parser';
import { createWriteStream } from 'fs';
import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

// Types
interface WordPressRow {
  [key: string]: string;
}

interface Attribute {
  name: string;
  values: string[];
  index: number; // 1, 2, or 3
  defaultValue?: string; // Default value from WordPress
  visible?: boolean; // Whether attribute is visible (from WordPress)
}

interface VariationProduct {
  id: string;
  sku: string;
  name: string;
  regular_price: string;
  sale_price: string;
  stock: string;
  in_stock?: string; // "1" = in stock, "0" or "backorder" = out of stock
  parent_sku: string;
  images?: string; // Comma-separated image URLs from WordPress
  inferred_attributes?: { [key: string]: string };
  // Store the original WordPress row data for direct attribute access
  wpRow?: WordPressRow; // Original WordPress row data
}

interface VariableProduct {
  id: string;
  sku: string;
  name: string;
  type: string;
  attributes: Attribute[];
  variations: VariationProduct[];
  [key: string]: any; // Other WordPress fields
}

interface OurCSVRow {
  sku: string;
  name: string;
  regular_price: string;
  [key: string]: any;
}

class WordPressTransformer {
  private openai: OpenAI | null = null;
  private variableProducts: Map<string, VariableProduct> = new Map();
  private simpleProducts: WordPressRow[] = [];
  private orphanedVariations: WordPressRow[] = []; // Store variations whose parent isn't found yet
  private allRows: WordPressRow[] = []; // Store all rows for reverse lookup
  private stats = {
    totalProducts: 0,
    variableProducts: 0,
    simpleProducts: 0,
    variationsProcessed: 0,
    aiInferences: 0,
    skuParses: 0,
    nameParses: 0,
    groupedProductsSkipped: 0,
  };

  constructor() {
    // Initialize OpenAI if API key is available
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.openai = new OpenAI({ 
        apiKey,
        timeout: 60000, // 60 second timeout for API calls
      });
      console.log('✅ OpenAI initialized');
    } else {
      console.warn('⚠️  OPENAI_API_KEY not found in .env. AI inference will be disabled.');
    }
  }

  /**
   * Parse WordPress CSV file
   */
  async parseWordPressCSV(filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const results: WordPressRow[] = [];
      const stream = fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row: WordPressRow) => {
          results.push(row);
        })
        .on('end', () => {
          console.log(`📊 Parsed ${results.length} rows from WordPress CSV`);
          this.processWordPressRows(results);
          resolve();
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  /**
   * Process WordPress rows and group by type
   */
  private processWordPressRows(rows: WordPressRow[]): void {
    this.stats.totalProducts = rows.length;
    this.allRows = rows; // Store for reverse lookup

    for (const row of rows) {
      const type = row['Type']?.trim();

      if (type === 'variable') {
        this.processVariableProduct(row);
      } else if (type === 'variation') {
        this.processVariationProduct(row);
      } else if (type === 'simple') {
        this.simpleProducts.push(row);
        this.stats.simpleProducts++;
      } else if (type === 'grouped') {
        // Skip grouped products and log error
        const sku = row['SKU']?.trim() || 'N/A';
        const name = row['Name']?.trim() || 'Unknown';
        console.error(`❌ ERROR: Grouped product found (SKU: ${sku}, Name: ${name}). Grouped products are not supported and will be skipped.`);
        this.stats.groupedProductsSkipped = (this.stats.groupedProductsSkipped || 0) + 1;
      }
      // Ignore other types (external, etc.)
    }

    console.log(`📦 Found ${this.variableProducts.size} variable products`);
    console.log(`📦 Found ${this.simpleProducts.length} simple products`);
    console.log(`📦 Found ${this.stats.variationsProcessed} variation products`);
    
    // Second pass: process orphaned variations
    this.processOrphanedVariations();
    
    if (this.stats.groupedProductsSkipped) {
      console.log(`⚠️  Skipped ${this.stats.groupedProductsSkipped} grouped products`);
    }
  }

  /**
   * Process a variable product (parent)
   */
  private processVariableProduct(row: WordPressRow): void {
    const sku = row['SKU']?.trim();
    if (!sku) {
      console.warn('⚠️  Skipping variable product without SKU');
      return;
    }

    const allAttributes: Array<{attr: Attribute; visible: boolean}> = [];

    // Extract attributes (1, 2, 3) - collect all first
    for (let i = 1; i <= 3; i++) {
      const attrName = row[`Attribute ${i} name`]?.trim();
      const attrValues = row[`Attribute ${i} value(s)`]?.trim();
      const attrDefault = row[`Attribute ${i} default`]?.trim();
      const attrVisible = row[`Attribute ${i} visible`]?.trim();
      const isVisible = attrVisible ? (attrVisible !== '0' && attrVisible.toLowerCase() !== 'false') : true;

      if (attrName && attrValues) {
        // Parse values - handle escaped commas (e.g., "General\, Civil" should not split)
        // WordPress uses backslash to escape commas in values
        // Strategy: split by comma, but merge back if next value doesn't start with space/capital
        let values: string[] = [];
        
        // First, handle pipe-separated (more reliable)
        if (attrValues.includes('|')) {
          values = attrValues.split('|').map(v => v.trim()).filter(v => v);
        } else {
          // Handle comma-separated, but respect escaped commas
          // Split by comma, then check if we need to merge (if value ends with backslash)
          const parts = attrValues.split(',');
          let currentValue = '';
          
          for (let j = 0; j < parts.length; j++) {
            const part = parts[j].trim();
            if (currentValue) {
              // Check if previous part ended with backslash (escaped comma)
              if (currentValue.endsWith('\\')) {
                // Merge with current part (remove backslash)
                currentValue = currentValue.slice(0, -1) + ',' + part;
              } else {
                // Previous value is complete, save it
                values.push(currentValue);
                currentValue = part;
              }
            } else {
              currentValue = part;
            }
          }
          
          // Don't forget the last value
          if (currentValue) {
            values.push(currentValue);
          }
        }
        
        // Clean up escaped commas in values
        values = values.map(v => v.replace(/\\,/g, ',')).filter(v => v.length > 0);
        
        if (values.length > 0) {
          allAttributes.push({
            attr: {
              name: attrName,
              values,
              index: i,
              defaultValue: attrDefault || undefined,
              visible: isVisible,
            },
            visible: isVisible,
          });
          if (sku === 'sim-racing-gen3' || sku === 'flightsim-msfs-edition-1') {
            console.log(`✅ DEBUG: Collected attribute ${i}: ${attrName} with ${values.length} values: ${values.join(', ')} (visible: ${isVisible})`);
          }
        }
      } else if (sku === 'sim-racing-gen3' || sku === 'flightsim-msfs-edition-1') {
        console.log(`🔍 DEBUG: Attribute ${i} skipped - name: "${attrName}", values: "${attrValues}"`);
      }
    }
    
    // Filter attributes: if any are visible, only keep visible ones; otherwise keep all
    const hasVisibleAttributes = allAttributes.some(a => a.visible);
    const attributes: Attribute[] = hasVisibleAttributes
      ? allAttributes.filter(a => a.visible).map(a => a.attr)
      : allAttributes.map(a => a.attr);
    
    if (sku === 'flightsim-msfs-edition-1') {
      console.log(`🔍 DEBUG: Filtered to ${attributes.length} attributes (had ${allAttributes.length} total, ${hasVisibleAttributes ? 'some visible' : 'all invisible'})`);
    }

    const variableProduct: VariableProduct = {
      id: row['ID']?.trim() || '',
      sku,
      name: row['Name']?.trim() || '',
      type: 'variable',
      attributes,
      variations: [],
      ...row, // Keep all other fields
    };

    this.variableProducts.set(sku, variableProduct);
    this.stats.variableProducts++;
  }

  /**
   * Process a variation product (child)
   */
  private processVariationProduct(row: WordPressRow): void {
    const parentSku = row['Parent']?.trim();
    if (!parentSku) {
      console.warn('⚠️  Skipping variation without Parent SKU');
      return;
    }

    const variableProduct = this.variableProducts.get(parentSku);
    if (!variableProduct) {
      // Parent not found yet, or parent is not a variable product
      // This can happen if variations come before parents in CSV
      // Store for second pass
      this.orphanedVariations.push(row);
      if (parentSku === 'sim-racing-gen3') {
        console.log(`🔍 DEBUG: Variation ${row['SKU']} orphaned, parent "${parentSku}" not found yet`);
      }
      return;
    }

    const variation: VariationProduct = {
      id: row['ID']?.trim() || '',
      sku: row['SKU']?.trim() || '',
      name: row['Name']?.trim() || '',
      regular_price: row['Regular price']?.trim() || '0',
      sale_price: row['Sale price']?.trim() || '',
      stock: row['Stock']?.trim() || '',
      in_stock: row['In stock?']?.trim() || undefined,
      parent_sku: parentSku,
      images: row['Images']?.trim() || undefined,
      wpRow: row, // Store original row for direct attribute access
    };

    variableProduct.variations.push(variation);
    this.stats.variationsProcessed++;
    
    if (parentSku === 'sim-racing-gen3') {
      console.log(`✅ DEBUG: Added variation ${variation.sku} to ${parentSku} (total: ${variableProduct.variations.length})`);
    }
  }

  /**
   * Process orphaned variations (second pass)
   */
  private processOrphanedVariations(): void {
    if (this.orphanedVariations.length === 0) return;

    console.log(`🔄 Processing ${this.orphanedVariations.length} orphaned variations...`);
    let processed = 0;
    const stillOrphaned: WordPressRow[] = [];

    for (const row of this.orphanedVariations) {
      const parentSku = row['Parent']?.trim();
      if (!parentSku) {
        console.warn('⚠️  Skipping variation without Parent SKU');
        continue;
      }

      const variableProduct = this.variableProducts.get(parentSku);
      if (!variableProduct) {
        stillOrphaned.push(row);
        if (parentSku === 'sim-racing-gen3') {
          console.warn(`⚠️  DEBUG: Still orphaned - parent "${parentSku}" not found in variableProducts map`);
          console.warn(`⚠️  DEBUG: Available parents: ${Array.from(this.variableProducts.keys()).join(', ')}`);
        }
        continue;
      }

      const variation: VariationProduct = {
        id: row['ID']?.trim() || '',
        sku: row['SKU']?.trim() || '',
        name: row['Name']?.trim() || '',
        regular_price: row['Regular price']?.trim() || '0',
        sale_price: row['Sale price']?.trim() || '',
        stock: row['Stock']?.trim() || '',
        in_stock: row['In stock?']?.trim() || undefined,
        parent_sku: parentSku,
        images: row['Images']?.trim() || undefined,
        wpRow: row, // Store original row for direct attribute access
      };

      variableProduct.variations.push(variation);
      this.stats.variationsProcessed++;
      processed++;
      
      if (parentSku === 'sim-racing-gen3') {
        console.log(`✅ DEBUG: Second pass - Added variation ${variation.sku} to ${parentSku} (total: ${variableProduct.variations.length})`);
      }
    }

    this.orphanedVariations = stillOrphaned;
    if (processed > 0) {
      console.log(`✅ Processed ${processed} orphaned variations`);
    }
    if (stillOrphaned.length > 0) {
      console.warn(`⚠️  ${stillOrphaned.length} variations still orphaned (parent not found)`);
    }
  }

  /**
   * Infer attribute values for a variation using multiple methods
   * First tries to use direct Attribute values from WordPress row, then falls back to inference
   */
  async inferVariationAttributes(
    variation: VariationProduct,
    variableProduct: VariableProduct
  ): Promise<{ [key: string]: string }> {
    const matches: { [key: string]: string } = {};
    
    // Method 0: Use direct Attribute values from WordPress variation row (most reliable)
    if (variation.wpRow) {
      for (const attr of variableProduct.attributes) {
        const attrValue = variation.wpRow[`Attribute ${attr.index} value(s)`]?.trim();
        if (attrValue) {
          // Handle escaped commas in the value
          let value = attrValue.replace(/\\,/g, ',');
          // If multiple values, take the first one (variations typically have one value per attribute)
          if (value.includes(',')) {
            value = value.split(',')[0].trim();
          }
          // Match this value to one of the attribute's possible values (case-insensitive)
          const normalizedValue = value.toLowerCase().trim();
          const matchingOption = attr.values.find(v => 
            v.toLowerCase().trim() === normalizedValue ||
            normalizedValue.includes(v.toLowerCase().trim()) ||
            v.toLowerCase().trim().includes(normalizedValue)
          );
          if (matchingOption) {
            matches[`attribute${attr.index}`] = matchingOption;
          }
        }
      }
      
      // If we got all attributes from direct values, return early
      if (this.isCompleteMatch(matches, variableProduct.attributes)) {
        return matches;
      }
    }
    
    // Method 1: Try SKU parsing
    const skuMatches = this.parseSKUForAttributes(variation.sku, variableProduct.attributes);
    // Merge with direct matches (direct matches take precedence)
    Object.assign(matches, skuMatches);
    if (this.isCompleteMatch(matches, variableProduct.attributes)) {
      this.stats.skuParses++;
      return matches;
    }

    // Method 2: Try name parsing
    const nameMatches = this.parseNameForAttributes(
      variation.name,
      variableProduct.name,
      variableProduct.attributes
    );
    // Merge with existing matches
    Object.assign(matches, nameMatches);
    if (this.isCompleteMatch(matches, variableProduct.attributes)) {
      this.stats.nameParses++;
      return matches;
    }

    // Method 3: Use OpenAI
    if (this.openai) {
      const aiMatches = await this.inferWithAI(variation, variableProduct);
      if (aiMatches) {
        // Merge with existing matches
        Object.assign(matches, aiMatches);
        this.stats.aiInferences++;
        return matches;
      }
    }

    // Fallback: Return whatever matches we have
    return matches;
  }

  /**
   * Parse SKU to find attribute values
   */
  private parseSKUForAttributes(sku: string, attributes: Attribute[]): { [key: string]: string } | null {
    if (!sku) return null;

    // Normalize SKU: replace hyphens and underscores with spaces for better matching
    const skuNormalized = sku.toLowerCase().replace(/[-_]/g, ' ');
    const matches: { [key: string]: string } = {};

    for (const attr of attributes) {
      // Sort values by length (longest first) to match more specific values first
      // e.g., "Olive Green" should match before "Green"
      const sortedValues = [...attr.values].sort((a, b) => b.length - a.length);
      
      for (const value of sortedValues) {
        const valueLower = value.toLowerCase();
        // Normalize value: replace hyphens with spaces
        const valueNormalized = valueLower.replace(/-/g, ' ');
        
        // Try exact match first
        if (skuNormalized.includes(valueNormalized)) {
          matches[`attribute${attr.index}`] = value;
          break; // Found a match for this attribute, move to next
        }
        
        // Also try word-by-word matching for multi-word values
        const valueWords = valueNormalized.split(/\s+/).filter(w => w.length > 0);
        if (valueWords.length > 1) {
          const allWordsMatch = valueWords.every(word => {
            // Check if word appears in normalized SKU
            return skuNormalized.includes(word);
          });
          if (allWordsMatch) {
            matches[`attribute${attr.index}`] = value;
            break;
          }
        }
      }
    }

    return Object.keys(matches).length > 0 ? matches : null;
  }

  /**
   * Parse name to find attribute values
   */
  private parseNameForAttributes(
    variationName: string,
    parentName: string,
    attributes: Attribute[]
  ): { [key: string]: string } | null {
    if (!variationName) return null;

    // Remove parent name to get remaining text
    const remaining = variationName.replace(parentName, '').trim();
    if (!remaining) return null;

    const remainingLower = remaining.toLowerCase();
    const matches: { [key: string]: string } = {};

    for (const attr of attributes) {
      // Sort values by length (longest first) to match more specific values first
      const sortedValues = [...attr.values].sort((a, b) => b.length - a.length);
      
      for (const value of sortedValues) {
        const valueLower = value.toLowerCase();
        // Use word boundaries for better matching
        const valueWords = valueLower.split(/\s+/);
        const allWordsMatch = valueWords.every(word => {
          const wordPattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
          return wordPattern.test(remainingLower);
        });
        
        if (remainingLower.includes(valueLower) || allWordsMatch) {
          matches[`attribute${attr.index}`] = value;
          break; // Found a match for this attribute, move to next
        }
      }
    }

    return Object.keys(matches).length > 0 ? matches : null;
  }

  /**
   * Retry helper with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Check if it's a timeout or connection error that we should retry
        const isRetryable = 
          error?.message?.includes('timeout') ||
          error?.message?.includes('timed out') ||
          error?.message?.includes('APIConnectionTimeoutError') ||
          error?.code === 'ECONNRESET' ||
          error?.code === 'ETIMEDOUT';
        
        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = baseDelayMs * Math.pow(2, attempt);
        console.log(`⚠️  Retry attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms delay...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    throw lastError || new Error('Retry failed');
  }

  /**
   * Use OpenAI to infer attribute values
   */
  private async inferWithAI(
    variation: VariationProduct,
    variableProduct: VariableProduct
  ): Promise<{ [key: string]: string } | null> {
    if (!this.openai) return null;

    try {
      // Build attributes list
      const attributesList = variableProduct.attributes
        .map(attr => `  ${attr.index}. ${attr.name}: ${attr.values.join(', ')}`)
        .join('\n');

      const prompt = `You are analyzing a WordPress product variation to determine which attribute values it represents.

Parent Product:
- Name: ${variableProduct.name}
- SKU: ${variableProduct.sku}
- Attributes:
${attributesList}

Variation:
- SKU: ${variation.sku || '(empty)'}
- Name: ${variation.name}
- Price: ${variation.regular_price}
- Stock: ${variation.stock}

Determine which attribute values this variation represents.
Return ONLY valid JSON in this format:
{
  "attribute1": "value1" or null,
  "attribute2": "value2" or null,
  "attribute3": "value3" or null
}

Use the exact attribute value names from the list above. If you cannot determine a value, use null.`;

      // Use retry logic with exponential backoff
      const response = await this.retryWithBackoff(async () => {
        return await this.openai!.chat.completions.create({
          model: 'gpt-4o-mini', // Using cheaper model for cost efficiency
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that analyzes product data and returns only valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3, // Lower temperature for more consistent results
          max_tokens: 200,
        });
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (!content) return null;

      // Parse JSON response
      // Remove markdown code blocks if present
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      // Clean up common JSON issues before parsing
      let jsonStr = jsonMatch[0];
      
      // Remove trailing commas before closing braces/brackets
      jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1');
      
      // Try to parse the cleaned JSON
      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
      } catch (parseError) {
        // If still fails, try to fix more issues
        console.warn(`⚠️  JSON parse failed, attempting cleanup for variation ${variation.sku || variation.name}`);
        
        // Try removing any comments or extra text
        jsonStr = jsonStr.replace(/\/\/.*$/gm, ''); // Remove single-line comments
        jsonStr = jsonStr.replace(/\/\*[\s\S]*?\*\//g, ''); // Remove multi-line comments
        
        // Try parsing again
        try {
          parsed = JSON.parse(jsonStr);
        } catch (secondError) {
          console.error(`❌ Could not parse JSON after cleanup: ${jsonStr.substring(0, 200)}...`);
          return null;
        }
      }
      
      // Convert to our format
      const result: { [key: string]: string } = {};
      for (const attr of variableProduct.attributes) {
        const key = `attribute${attr.index}`;
        if (parsed[key] && typeof parsed[key] === 'string') {
          result[key] = parsed[key];
        }
      }

      return Object.keys(result).length > 0 ? result : null;
    } catch (error) {
      console.error(`❌ OpenAI inference error for variation ${variation.sku || variation.name}:`, error);
      return null;
    }
  }

  /**
   * Check if all attributes are matched
   */
  private isCompleteMatch(
    matches: { [key: string]: string },
    attributes: Attribute[]
  ): boolean {
    return attributes.every(attr => matches[`attribute${attr.index}`]);
  }

  /**
   * Calculate price adjustments for options
   */
  private calculatePriceAdjustments(
    variableProduct: VariableProduct,
    variations: VariationProduct[]
  ): Map<string, Map<string, number>> {
    // Map: attributeIndex -> optionValue -> price_adjustment
    const adjustments = new Map<string, Map<string, number>>();

    // Find base price (minimum variation price)
    const prices = variations
      .map(v => parseFloat(v.regular_price) || 0)
      .filter(p => p > 0);
    
    if (prices.length === 0) {
      // No prices, return zero adjustments
      return adjustments;
    }

    const basePrice = Math.min(...prices);

    // Group variations by attribute values
    for (const attr of variableProduct.attributes) {
      const attrAdjustments = new Map<string, number[]>();

      for (const variation of variations) {
        const attrValue = variation.inferred_attributes?.[`attribute${attr.index}`];
        if (!attrValue) continue;

        const price = parseFloat(variation.regular_price) || 0;
        if (price > 0) {
          const adjustment = price - basePrice;
          if (!attrAdjustments.has(attrValue)) {
            attrAdjustments.set(attrValue, []);
          }
          attrAdjustments.get(attrValue)!.push(adjustment);
        }
      }

      // Calculate average adjustment per option
      const finalAdjustments = new Map<string, number>();
      for (const [value, adjustmentsList] of attrAdjustments.entries()) {
        if (adjustmentsList.length > 0) {
          const avg = adjustmentsList.reduce((a, b) => a + b, 0) / adjustmentsList.length;
          finalAdjustments.set(value, Math.round(avg * 100) / 100); // Round to 2 decimals
        }
      }

      adjustments.set(`attribute${attr.index}`, finalAdjustments);
    }

    return adjustments;
  }

  /**
   * Calculate minimum stock per option (Option C)
   * Handles empty stock correctly: if stock is empty but "In stock?" is "1", treat as null (unlimited)
   */
  private calculateMinimumStock(
    variableProduct: VariableProduct,
    variations: VariationProduct[]
  ): Map<string, Map<string, number | null>> {
    // Map: attributeIndex -> optionValue -> minimum_stock (null = unlimited/not managed)
    const stockMap = new Map<string, Map<string, number | null>>();

    for (const attr of variableProduct.attributes) {
      const attrStock = new Map<string, Array<number | null>>();

      for (const variation of variations) {
        const attrValue = variation.inferred_attributes?.[`attribute${attr.index}`];
        if (!attrValue) continue;

        // Parse stock: empty stock + "In stock?" = "1" means unlimited (null)
        // Empty stock + "In stock?" != "1" means 0 (out of stock)
        // Non-empty stock is the actual stock value
        let stock: number | null = null;
        const stockStr = variation.stock?.trim() || '';
        const inStock = variation.in_stock?.trim() || '';
        
        if (stockStr === '') {
          // Empty stock field
          if (inStock === '1') {
            // Stock not managed but in stock = unlimited
            stock = null;
          } else {
            // Stock not managed but out of stock = 0
            stock = 0;
          }
        } else {
          // Has stock value
          const parsedStock = parseInt(stockStr);
          stock = isNaN(parsedStock) ? 0 : parsedStock;
        }
        
        if (!attrStock.has(attrValue)) {
          attrStock.set(attrValue, []);
        }
        attrStock.get(attrValue)!.push(stock);
      }

      // Calculate minimum stock per option
      // null values (unlimited) are ignored in minimum calculation
      const finalStock = new Map<string, number | null>();
      for (const [value, stockList] of attrStock.entries()) {
        if (stockList.length > 0) {
          // Filter out null values (unlimited stock)
          const numericStocks = stockList.filter(s => s !== null) as number[];
          
          if (numericStocks.length === 0) {
            // All variations have unlimited stock (null)
            finalStock.set(value, null);
          } else if (stockList.some(s => s === null)) {
            // Some have unlimited, some have numeric - use null (unlimited) since at least one is unlimited
            finalStock.set(value, null);
          } else {
            // All have numeric stock - take minimum
            const minStock = Math.min(...numericStocks);
            finalStock.set(value, minStock);
          }
        }
      }

      stockMap.set(`attribute${attr.index}`, finalStock);
    }

    return stockMap;
  }

  /**
   * Transform variable product to our CSV format
   */
  async transformVariableProduct(variableProduct: VariableProduct): Promise<OurCSVRow> {
    if (variableProduct.variations.length === 0) {
      console.warn(`⚠️  Variable product "${variableProduct.sku}" has no variations!`);
    } else {
      console.log(`📦 Transforming variable product: ${variableProduct.sku} (${variableProduct.variations.length} variations)`);
    }
    
    if (variableProduct.attributes.length === 0) {
      console.warn(`⚠️  Variable product "${variableProduct.sku}" has no attributes! This will result in empty variations.`);
    } else {
      console.log(`🔍 DEBUG: ${variableProduct.sku} has ${variableProduct.attributes.length} attributes:`, 
        variableProduct.attributes.map(a => `${a.name} (${a.values.length} values)`).join(', '));
    }
    
    // Infer attributes for all variations in parallel
    await Promise.all(
      variableProduct.variations.map(async (variation) => {
        variation.inferred_attributes = await this.inferVariationAttributes(variation, variableProduct);
      })
    );

    // Calculate price adjustments
    const priceAdjustments = this.calculatePriceAdjustments(variableProduct, variableProduct.variations);

    // Calculate minimum stock
    const stockMap = this.calculateMinimumStock(variableProduct, variableProduct.variations);

    // Build a map of option value -> variation image
    // For each variation, check its inferred attributes and use its image for matching options
    // IMPORTANT: Only assign image to the attribute that best matches the image content
    const optionToImageMap = new Map<string, string>();
    
    // Helper function to normalize attribute values for matching
    // Converts "Large universal flight plate #A" -> "largeuniversalflightplatea"
    // This handles mismatches between parent (human-readable) and variation (slug) formats
    const normalizeForMatching = (value: string): string => {
      return value
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '') // Remove all non-alphanumeric
        .trim();
    };
    
    for (const variation of variableProduct.variations) {
      if (!variation.images || !variation.inferred_attributes) continue;
      
      // Parse variation images (comma-separated)
      const variationImages = variation.images.split(',').map((url: string) => url.trim()).filter((url: string) => url);
      if (variationImages.length === 0) continue;
      
      // Use the first image from the variation
      const variationImage = variationImages[0];
      const imageUrlLower = variationImage.toLowerCase();
      
      // Determine which attribute this image belongs to based on image URL and variation attributes
      // Strategy: Match image to the attribute that makes the most sense
      let bestMatchAttr: { index: number; value: string } | null = null;
      let bestMatchScore = 0;
      
      for (const attr of variableProduct.attributes) {
        // Try direct attribute value from wpRow first (most accurate)
        let attrValue: string | undefined;
        if (variation.wpRow) {
          attrValue = variation.wpRow[`Attribute ${attr.index} value(s)`]?.trim();
        }
        // Fallback to inferred attribute
        if (!attrValue) {
          attrValue = variation.inferred_attributes[`attribute${attr.index}`];
        }
        // Skip if attribute value is empty or missing
        if (!attrValue || attrValue.trim() === '') continue;
        
        const attrValueLower = attrValue.toLowerCase().trim();
        const attrValueNormalized = normalizeForMatching(attrValue);
        let matchScore = 0;
        
        // Check if image URL contains keywords from the attribute value
        const attrWords = attrValueLower.split(/\s+/).filter(w => w.length > 2);
        for (const word of attrWords) {
          if (imageUrlLower.includes(word)) {
            matchScore += 1;
          }
        }
        
        // Also check attribute name for keywords
        const attrNameLower = attr.name.toLowerCase();
        if (attrNameLower.includes('color') || attrNameLower.includes('colour')) {
          // Color attributes: check if image URL contains color-related keywords
          const colorKeywords = ['black', 'blue', 'gray', 'grey', 'green', 'olive', 'orange', 'red', 'yellow', 'white'];
          if (colorKeywords.some(color => attrValueLower.includes(color) && imageUrlLower.includes(color))) {
            matchScore += 5; // Strong match for colors
          }
        }
        
        // Check if attribute name matches image content (e.g., "pedal plate" in name and URL)
        const attrNameWords = attrNameLower.split(/\s+/).filter(w => w.length > 2);
        for (const word of attrNameWords) {
          if (imageUrlLower.includes(word)) {
            matchScore += 2; // Attribute name match
          }
        }
        
        // Bonus score if using direct wpRow value (more reliable)
        if (variation.wpRow && variation.wpRow[`Attribute ${attr.index} value(s)`]?.trim()) {
          matchScore += 2;
        }
        
        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          bestMatchAttr = { index: attr.index, value: attrValue };
        }
      }
      
      // Only assign image to the best matching attribute IF match score > 0
      // Don't assign if no good match (prevents wrong assignments)
      if (bestMatchAttr && bestMatchScore > 0) {
        const normalizedValue = bestMatchAttr.value.toLowerCase().trim();
        const mapKey = `attr${bestMatchAttr.index}_${normalizedValue}`;
        // Also store normalized version for matching
        const normalizedKey = `attr${bestMatchAttr.index}_${normalizeForMatching(bestMatchAttr.value)}`;
        // Only set if not already set (first variation wins)
        if (!optionToImageMap.has(mapKey)) {
          optionToImageMap.set(mapKey, variationImage);
          // Also store normalized version
          if (normalizedKey !== mapKey) {
            optionToImageMap.set(normalizedKey, variationImage);
          }
        }
      }
      // Removed fallback - if no good match, don't assign image to avoid wrong assignments
    }
    
    // Also check parent product images as fallback
    const parentImages: string[] = [];
    if (variableProduct['Images']) {
      const imageUrls = variableProduct['Images'].split(',').map((url: string) => url.trim()).filter((url: string) => url);
      parentImages.push(...imageUrls);
    }

    // Helper function to find image URL for an option
    const findImageForOption = (attrIndex: number, optionName: string): string | undefined => {
      if (!optionName) return undefined;
      
      const optionNameLower = optionName.toLowerCase().trim();
      const optionNameNormalized = normalizeForMatching(optionName);
      const mapKey = `attr${attrIndex}_${optionNameLower}`;
      
      // First, try exact match from variation map (most accurate)
      if (optionToImageMap.has(mapKey)) {
        return optionToImageMap.get(mapKey);
      }
      
      // Try normalized match (handles slug vs human-readable format mismatch)
      for (const [key, imageUrl] of optionToImageMap.entries()) {
        if (key.startsWith(`attr${attrIndex}_`)) {
          const keyValue = key.replace(`attr${attrIndex}_`, '');
          const keyValueNormalized = normalizeForMatching(keyValue);
          
          // Try normalized match first (handles format differences)
          if (keyValueNormalized === optionNameNormalized) {
            return imageUrl;
          }
          
          // Fallback to partial match
          if (keyValue.includes(optionNameLower) || optionNameLower.includes(keyValue)) {
            return imageUrl;
          }
        }
      }
      
      // Fallback: try to find in parent images by matching option name in URL
      if (parentImages.length > 0) {
        const matchingImage = parentImages.find((imageUrl) => {
          const urlLower = imageUrl.toLowerCase();
          // Check if URL contains the option name (with word boundaries)
          const namePattern = new RegExp(`\\b${optionNameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
          return namePattern.test(urlLower);
        });
        if (matchingImage) {
          return matchingImage;
        }
      }
      
      return undefined;
    };

    // Build variations JSON (already parallelized with Promise.all)
    const variations = variableProduct.attributes.map(async (attr, attrIndex) => {
      // Determine default value: use WordPress default if available, otherwise first option
      const defaultValue = attr.defaultValue || attr.values[0];
      
      // Build options first to check if any have images
      const options = attr.values.map((value, valueIndex) => {
        const priceAdj = priceAdjustments.get(`attribute${attr.index}`)?.get(value) || 0;
        const stock = stockMap.get(`attribute${attr.index}`)?.get(value) ?? null;
        // Set as default if it matches the default value (case-insensitive match)
        const isDefault = value.toLowerCase().trim() === defaultValue?.toLowerCase().trim();

        // Try to find matching image URL for this option
        const imageUrl = findImageForOption(attr.index, value);

        return {
          option_name: value,
          option_value: value,
          price_adjustment: priceAdj,
          image_url: imageUrl, // Will be removed if type is not 'image'
          is_default: isDefault,
          sort_order: valueIndex,
          stock_quantity: stock, // null = unlimited/not managed
          low_stock_threshold: stock !== null ? Math.floor(stock * 0.2) : null, // 20% threshold, null if unlimited
          is_available: stock === null ? true : stock > 0, // null (unlimited) = available
        };
      });
      
      // Check if any options have images - if so, use "image" type
      const hasImages = options.some(opt => opt.image_url && opt.image_url.trim());
      
      // Infer variation type (but override to "image" if images are present)
      let variationType = await this.inferVariationType(
        variableProduct.name,
        attr.name,
        attr.values
      );
      
      // Override: if any option has an image, it's an image variation
      if (hasImages) {
        variationType = 'image';
      }
      
      // Remove image_url from options if type is not 'image'
      // Dropdowns should never have image URLs
      const finalOptions = variationType === 'image' 
        ? options 
        : options.map(opt => {
            const { image_url, ...rest } = opt;
            return rest;
          });

      return {
        variation_type: variationType,
        name: attr.name,
        is_required: true,
        tracks_stock: true, // Track stock per option
        sort_order: attrIndex,
        options: finalOptions,
      };
    });

    // Wait for all variations to be processed (since inferVariationType is async)
    const resolvedVariations = await Promise.all(variations);

    // Build CSV row
    const row: OurCSVRow = {
      sku: variableProduct.sku,
      name: variableProduct.name,
      regular_price: this.calculateBasePrice(variableProduct.variations),
      type: 'simple', // We'll handle variations in JSON
      status: this.mapStatus(variableProduct),
      description: await this.extractTextFromHTML(variableProduct['Description']),
      short_description: await this.extractTextFromHTML(variableProduct['Short description'] || ''),
      featured: variableProduct['Is featured?'] === '1' ? 'true' : 'false',
      sale_price: this.calculateSalePrice(variableProduct.variations),
      is_on_sale: this.hasSalePrice(variableProduct.variations) ? 'true' : 'false',
      sale_start_date: variableProduct['Date sale price starts'] ? new Date(variableProduct['Date sale price starts']).toISOString() : '',
      sale_end_date: variableProduct['Date sale price ends'] ? new Date(variableProduct['Date sale price ends']).toISOString() : '',
      stock: this.calculateTotalStock(variableProduct.variations).toString(),
      in_stock: this.calculateTotalStock(variableProduct.variations) > 0 ? '1' : '0',
      weight_lbs: variableProduct['Weight (lbs)'] || '',
      length_in: variableProduct['Length (in)'] || '',
      width_in: variableProduct['Width (in)'] || '',
      height_in: variableProduct['Height (in)'] || '',
      tax_class: variableProduct['Tax class'] || '',
      shipping_class: variableProduct['Shipping class'] || '',
      categories: this.parseCategories(variableProduct['Categories']),
      tags: this.parseTags(variableProduct['Tags']),
      brands: variableProduct['Brands'] || '',
      gtin_upc_ean_isbn: variableProduct['GTIN, UPC, EAN, or ISBN'] || '',
      published: variableProduct['Published'] || '',
      visibility_in_catalog: variableProduct['Visibility in catalog'] || '',
      tax_status: variableProduct['Tax status'] || '',
      backorders_allowed: variableProduct['Backorders allowed?'] || '',
      sold_individually: variableProduct['Sold individually?'] || '',
      allow_customer_reviews: variableProduct['Allow customer reviews?'] || '',
      purchase_note: variableProduct['Purchase note'] || '',
      product_images: this.parseImages(variableProduct['Images']),
      product_variations: JSON.stringify(resolvedVariations),
      product_bundle_items: this.parseCrossSells(
        variableProduct['Cross-sells'], 
        variableProduct.sku,
        variableProduct['Description']
      ),
      is_bundle: (variableProduct['Cross-sells']?.trim() || 
                  this.extractProductLinksFromDescription(variableProduct['Description'] || '').length > 0) 
                 ? 'true' : 'false',
      low_stock_amount: variableProduct['Low stock amount'] || '',
      region: 'us', // Default, can be adjusted
      package_weight: variableProduct['Weight (lbs)'] || '',
      package_weight_unit: variableProduct['Weight (lbs)'] ? 'lbs' : '',
      package_length: variableProduct['Length (in)'] || '',
      package_width: variableProduct['Width (in)'] || '',
      package_height: variableProduct['Height (in)'] || '',
      package_dimension_unit: (variableProduct['Length (in)'] || variableProduct['Width (in)'] || variableProduct['Height (in)']) ? 'in' : '',
      tariff_code: '', // Left empty - to be set manually in admin
    };

    return row;
  }

  /**
   * Calculate base price (minimum variation price)
   */
  private calculateBasePrice(variations: VariationProduct[]): string {
    const prices = variations
      .map(v => parseFloat(v.regular_price) || 0)
      .filter(p => p > 0);
    
    if (prices.length === 0) return '0';
    return Math.min(...prices).toString();
  }

  /**
   * Calculate sale price (minimum sale price if all have same sale)
   */
  private calculateSalePrice(variations: VariationProduct[]): string {
    const salePrices = variations
      .map(v => parseFloat(v.sale_price) || 0)
      .filter(p => p > 0);
    
    if (salePrices.length === 0) return '';
    return Math.min(...salePrices).toString();
  }

  /**
   * Check if any variation has sale price
   */
  private hasSalePrice(variations: VariationProduct[]): boolean {
    return variations.some(v => v.sale_price && parseFloat(v.sale_price) > 0);
  }

  /**
   * Calculate total stock (sum of all variations)
   * Handles empty stock: if stock is empty but "In stock?" is "1", treat as unlimited (return large number)
   */
  private calculateTotalStock(variations: VariationProduct[]): number {
    let total = 0;
    let hasUnlimited = false;
    
    for (const v of variations) {
      const stockStr = v.stock?.trim() || '';
      const inStock = v.in_stock?.trim() || '';
      
      if (stockStr === '') {
        // Empty stock field
        if (inStock === '1') {
          // Stock not managed but in stock = unlimited
          hasUnlimited = true;
        } else {
          // Stock not managed but out of stock = 0
          total += 0;
        }
      } else {
        // Has stock value
        const parsedStock = parseInt(stockStr);
        total += isNaN(parsedStock) ? 0 : parsedStock;
      }
    }
    
    // If any variation has unlimited stock, return a large number to indicate "in stock"
    if (hasUnlimited) {
      return 999999; // Large number to indicate unlimited/available
    }
    
    return total;
  }

  /**
   * Map WordPress status to our status
   */
  private mapStatus(product: WordPressRow): string {
    const published = product['Published']?.trim();
    if (published === '1') return 'active';
    return 'draft';
  }

  /**
   * Parse categories (take first one, normalize case, handle hierarchical)
   */
  private parseCategories(categories?: string): string {
    if (!categories) return '';
    
    // WordPress uses comma-separated, we use single category
    const firstCategory = categories.split(',')[0].trim();
    
    if (!firstCategory) return '';
    
    // Handle hierarchical categories (e.g., "FLIGHT SIM > Flight Sim Accessories")
    // Take the last part (most specific) or first part if no hierarchy
    const parts = firstCategory.split('>').map(p => p.trim());
    const category = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    
    // Normalize case: Convert ALL CAPS to Title Case
    // "SIM RACING" -> "Sim Racing"
    // "FLIGHT SIM" -> "Flight Sim"
    // But preserve existing title case: "Flight Sim Accessories" -> "Flight Sim Accessories"
    const normalized = category
      .split(' ')
      .map(word => {
        // If word is all caps, convert to title case
        if (word === word.toUpperCase() && word.length > 1) {
          return word.charAt(0) + word.slice(1).toLowerCase();
        }
        // Otherwise keep as-is
        return word;
      })
      .join(' ');
    
    // Map WordPress category names to valid slugs
    const categoryLower = normalized.toLowerCase();
    
    // Direct matches
    if (categoryLower.includes('sim racing') || categoryLower === 'sim racing') {
      return 'sim-racing';
    }
    if (categoryLower.includes('flight sim') || categoryLower === 'flight sim') {
      return 'flight-sim';
    }
    if (categoryLower.includes('accessories') || categoryLower === 'all accessories') {
      return 'accessories';
    }
    if (categoryLower.includes('cockpit')) {
      return 'cockpits';
    }
    if (categoryLower.includes('monitor stand') || categoryLower.includes('stand')) {
      return 'monitor-stands';
    }
    if (categoryLower.includes('conversion kit')) {
      return 'conversion-kits';
    }
    if (categoryLower.includes('service')) {
      return 'services';
    }
    if (categoryLower.includes('individual part')) {
      return 'individual-parts';
    }
    if (categoryLower.includes('racing') && categoryLower.includes('seat') || 
        categoryLower.includes('flight') && categoryLower.includes('seat')) {
      return 'racing-flight-seats';
    }
    if (categoryLower.includes('refurbished')) {
      return 'refurbished';
    }
    
    // Fallback: try to convert to slug format
    // "Sim Racing" -> "sim-racing"
    const slug = normalized
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    
    // Check if the slug matches any valid category
    const validCategories = [
      'flight-sim', 
      'sim-racing', 
      'cockpits', 
      'monitor-stands', 
      'accessories',
      'conversion-kits',
      'services',
      'individual-parts',
      'racing-flight-seats',
      'refurbished'
    ];
    if (validCategories.includes(slug)) {
      return slug;
    }
    
    // If no match, return the slug anyway (will be flagged as invalid during import)
    console.warn(`⚠️  Unknown category: "${normalized}" -> "${slug}" (will be flagged during import)`);
    return slug;
  }

  /**
   * Extract text content from HTML/Fusion Builder shortcodes
   * Uses AI if available for better HTML parsing, otherwise falls back to regex
   */
  private async extractTextFromHTML(html?: string): Promise<string> {
    if (!html) return '';
    
    // If OpenAI is available and HTML is complex, use AI to extract text
    if (this.openai && (html.includes('<p') || html.includes('<div') || html.includes('<span'))) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'Extract plain text from HTML. Remove all HTML tags, attributes, and formatting. Convert <p> tags to newlines. Preserve the text content only. Do not add any commentary or explanations.'
            },
            {
              role: 'user',
              content: html.substring(0, 4000) // Limit to avoid token limits
            }
          ],
          temperature: 0,
          max_tokens: 2000
        });
        
        const extractedText = response.choices[0]?.message?.content?.trim() || '';
        if (extractedText) {
          // Clean up any remaining issues
          return this.cleanExtractedText(extractedText);
        }
      } catch (error) {
        console.warn('⚠️  AI HTML extraction failed, falling back to regex:', error instanceof Error ? error.message : 'Unknown error');
        // Fall through to regex-based extraction
      }
    }
    
    // Fallback to regex-based extraction
    return this.extractTextFromHTMLRegex(html);
  }

  /**
   * Clean extracted text (remove extra whitespace, normalize newlines)
   */
  private cleanExtractedText(text: string): string {
    // Handle literal \n strings
    text = text.replace(/\\r\\n/g, '\r\n');
    text = text.replace(/\\n/g, '\n');
    text = text.replace(/\\r/g, '\r');
    text = text.replace(/\\t/g, '\t');
    
    // Clean up whitespace
    text = text.replace(/[ \t]+/g, ' '); // Collapse spaces/tabs
    text = text.replace(/\n[ \t]+/g, '\n'); // Remove spaces after newlines
    text = text.replace(/[ \t]+\n/g, '\n'); // Remove spaces before newlines
    text = text.replace(/\n{3,}/g, '\n\n'); // Collapse 3+ newlines to 2
    
    // Remove leading and trailing whitespace
    text = text.replace(/^\s+/, '').replace(/\s+$/, '');
    
    return text.trim();
  }

  /**
   * Regex-based HTML extraction (fallback)
   */
  private extractTextFromHTMLRegex(html: string): string {
    let text = html;
    
    // First, handle literal \n strings (escaped newlines) - do this before HTML stripping
    // WordPress CSV can have literal backslash-n strings that need to be converted to actual newlines
    // Handle various patterns: \n, \\n, \r\n, \\r\\n
    // Replace in order: \\r\\n -> \r\n, \\n -> \n, \\r -> \r, \\t -> \t
    text = text.replace(/\\r\\n/g, '\r\n'); // Handle literal \r\n
    text = text.replace(/\\n/g, '\n'); // Handle literal \n
    text = text.replace(/\\r/g, '\r'); // Handle literal \r
    text = text.replace(/\\t/g, '\t'); // Handle literal \t
    
    // Extract text from Fusion Builder shortcodes
    // Pattern: [fusion_text ...]content[/fusion_text] -> extract "content"
    // Pattern: [fusion_title ...]content[/fusion_title] -> extract "content"
    const shortcodePattern = /\[fusion_(?:text|title|button|separator)[^\]]*\](.*?)\[\/fusion_(?:text|title|button|separator)\]/gis;
    const extractedTexts: string[] = [];
    
    let match;
    while ((match = shortcodePattern.exec(text)) !== null) {
      if (match[1]) {
        extractedTexts.push(match[1].trim());
      }
    }
    
    // If we found text in shortcodes, use that
    if (extractedTexts.length > 0) {
      text = extractedTexts.join('\n\n');
    }
    
    // Strip ALL HTML tags (including nested ones) - more aggressive approach
    // First, remove script and style tags completely (with content)
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Then strip all remaining HTML tags
    text = text.replace(/<[^>]+>/g, '');
    
    // Strip remaining shortcodes (any [fusion_...] tags)
    text = text.replace(/\[fusion_[^\]]+\]/gi, '');
    text = text.replace(/\[\/fusion_[^\]]+\]/gi, '');
    
    // Decode HTML entities (do this after stripping tags)
    text = text
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&#160;/g, ' ') // Non-breaking space
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '...');
    
    // Clean up: collapse multiple spaces to single space, but preserve newlines
    text = text.replace(/[ \t]+/g, ' '); // Collapse spaces/tabs (but not newlines)
    text = text.replace(/\n[ \t]+/g, '\n'); // Remove spaces/tabs after newlines
    text = text.replace(/[ \t]+\n/g, '\n'); // Remove spaces/tabs before newlines
    text = text.replace(/\n{3,}/g, '\n\n'); // Collapse 3+ newlines to 2
    
    // Remove leading and trailing newlines and whitespace
    text = text.replace(/^\s+/, '').replace(/\s+$/, '');
    
    // Trim overall whitespace
    text = text.trim();
    
    // Limit length to prevent extremely long descriptions (e.g., 5000 chars)
    if (text.length > 5000) {
      text = text.substring(0, 5000) + '...';
    }
    
    return text;
  }

  /**
   * Parse tags (convert comma to pipe)
   */
  private parseTags(tags?: string): string {
    if (!tags) return '';
    return tags.split(',').map(t => t.trim()).filter(t => t).join('|');
  }

  /**
   * Parse images (convert comma-separated to JSON array)
   */
  private parseImages(images?: string): string {
    if (!images) return '';
    
    const imageUrls = images.split(',').map(url => url.trim()).filter(url => url);
    if (imageUrls.length === 0) return '';

    const imageObjects = imageUrls.map((url, index) => ({
      image_url: url,
      alt_text: '',
      is_primary: index === 0,
      sort_order: index,
    }));

    return JSON.stringify(imageObjects);
  }

  /**
   * Parse Cross-sells (frequently bought together / optional addons)
   * NOTE: WordPress "Cross-sells" are "frequently bought together" products
   * These should be mapped to optional bundle items (item_type = 'optional')
   * 
   * We use multiple methods:
   * 1. Parse Cross-sells from the product itself
   * 2. Reverse lookup: find products that have this product in their Cross-sells
   * 3. Parse product links from description (e.g., href="...product/slug/")
   * 
   * Filters applied:
   * - Exclude products that are too expensive (likely not addons)
   * - Exclude variable products (likely main products, not addons)
   * - Exclude products with $0 price (might be configurations)
   */
  private parseCrossSells(crossSells?: string, productSku?: string, description?: string): string {
    const skus = new Set<string>();
    
    // 1. Parse Cross-sells from the product itself
    if (crossSells && crossSells.trim()) {
      const directSkus = crossSells
        .split(',')
        .map(sku => sku.trim())
        .filter(sku => sku.length > 0);
      directSkus.forEach(sku => skus.add(sku));
    }
    
    // 2. Reverse lookup: find products that have this product in their Cross-sells
    if (productSku) {
      for (const row of this.allRows) {
        const rowCrossSells = row['Cross-sells']?.trim();
        if (rowCrossSells) {
          const crossSellSkus = rowCrossSells
            .split(',')
            .map(s => s.trim().toLowerCase());
          if (crossSellSkus.includes(productSku.toLowerCase())) {
            const addonSku = row['SKU']?.trim();
            if (addonSku) {
              skus.add(addonSku);
            }
          }
        }
      }
    }
    
    // 3. Parse product links from description
    if (description) {
      const productLinks = this.extractProductLinksFromDescription(description);
      productLinks.forEach(sku => skus.add(sku));
    }
    
    // Filter out products that shouldn't be addons
    const filteredSkus = Array.from(skus).filter(sku => {
      const product = this.findProductBySlugOrSku(sku);
      if (!product) return false;
      
      const price = parseFloat(product['Regular price'] || '0');
      const type = product['Type']?.trim().toLowerCase();
      const name = (product['Name'] || '').toLowerCase();
      const skuLower = sku.toLowerCase();
      
      // Filter criteria:
      // 1. Exclude variable products (main products, not addons)
      if (type === 'variable') {
        return false;
      }
      
      // 2. Exclude products that are too expensive (likely main products, not addons)
      // Threshold: $150 - addons are usually accessories under $150
      if (price > 150) {
        return false;
      }
      
      // 3. Exclude $0 products (might be configurations or placeholders)
      if (price === 0) {
        return false;
      }
      
      // 4. Exclude products with "configuration" or "config" in name (these are setups, not addons)
      // Also exclude products with "config" in SKU unless it's a plate
      if (name.includes('configuration') || name.includes('config ') || 
          (skuLower.includes('config') && !skuLower.includes('plate'))) {
        return false;
      }
      
      // 5. Exclude products that are clearly main products (cockpits, seats, etc.)
      const mainProductKeywords = ['cockpit', 'seat', 'chassis', 'frame'];
      if (mainProductKeywords.some(keyword => name.includes(keyword) && price > 50)) {
        return false;
      }
      
      // 6. Exclude products with "bracket" or "mount" in name that are expensive (likely configurations)
      // But keep plates which are true addons
      if ((name.includes('bracket') || name.includes('mount')) && price > 50 && !name.includes('plate')) {
        return false;
      }
      
      return true;
    });
    
    if (filteredSkus.length === 0) return '';

    // Convert to bundle items format (optional addons)
    const bundleItems = filteredSkus.map((sku, index) => ({
      item_sku: sku,
      quantity: 1, // Default quantity
      item_type: 'optional' as const, // Cross-sells are optional addons
      is_configurable: false, // Default to not configurable
      price_adjustment: 0, // Default no price adjustment
      sort_order: index,
    }));

    return JSON.stringify(bundleItems);
  }

  /**
   * Extract product SKUs from product links in description
   * Looks for patterns like: product/slug, /product/slug, href="...product/slug"
   */
  private extractProductLinksFromDescription(description: string): string[] {
    const skus: string[] = [];
    
    if (!description) return skus;
    
    // Pattern 1: product/slug or /product/slug
    const productLinkPattern = /(?:^|\/|\s)product\/([^\/"\s\?]+)/gi;
    const matches = description.matchAll(productLinkPattern);
    
    for (const match of matches) {
      const slug = match[1].toLowerCase().trim();
      if (slug && slug.length > 0) {
        // Try to find matching product by slug or SKU
        const matchingProduct = this.findProductBySlugOrSku(slug);
        if (matchingProduct) {
          const sku = matchingProduct['SKU']?.trim();
          if (sku && !skus.includes(sku)) {
            skus.push(sku);
          }
        }
      }
    }
    
    return skus;
  }

  /**
   * Find a product by slug (from URL) or SKU
   */
  private findProductBySlugOrSku(slug: string): WordPressRow | null {
    const slugLower = slug.toLowerCase();
    
    // First try exact SKU match
    for (const row of this.allRows) {
      const sku = row['SKU']?.trim().toLowerCase();
      if (sku === slugLower) {
        return row;
      }
    }
    
    // Then try SKU contains slug or slug contains SKU
    for (const row of this.allRows) {
      const sku = row['SKU']?.trim().toLowerCase();
      if (sku && (slugLower.includes(sku) || sku.includes(slugLower))) {
        return row;
      }
    }
    
    // Special handling for common patterns
    // "flight-controls-vp-plate-j" -> "plateJ"
    if (slugLower.includes('vp-plate-j') || slugLower.includes('vp-plate-j')) {
      const plateJ = this.allRows.find(r => r['SKU']?.trim().toLowerCase() === 'platej');
      if (plateJ) return plateJ;
    }
    
    // "large-universal-flight-plate" or "plate-a" -> find Plate A products
    if (slugLower.includes('plate-a') || slugLower.includes('large-universal-flight-plate')) {
      const plateA = this.allRows.find(r => 
        r['SKU']?.trim().toLowerCase().includes('plate-a') ||
        r['Name']?.toLowerCase().includes('plate a') ||
        r['Name']?.toLowerCase().includes('large universal flight plate')
      );
      if (plateA) return plateA;
    }
    
    // Then try name-based slug matching
    for (const row of this.allRows) {
      const name = row['Name']?.trim().toLowerCase();
      if (name) {
        // Convert name to slug format and compare
        const nameSlug = name
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        if (nameSlug.includes(slugLower) || slugLower.includes(nameSlug)) {
          return row;
        }
        
        // Also check if key words from slug appear in name
        const slugWords = slugLower.split('-').filter(w => w.length > 2);
        const nameWords = name.split(/[\s-]+/).filter(w => w.length > 2);
        const matchingWords = slugWords.filter(w => nameWords.some(nw => nw.includes(w) || w.includes(nw)));
        if (matchingWords.length >= 2) { // At least 2 words match
          return row;
        }
      }
    }
    
    return null;
  }

  /**
   * Parse upsells (You may also like - NOT the same as optional addons)
   * NOTE: WordPress "Upsells" are "You may also like" suggestions
   * These are DIFFERENT from "frequently bought together" (Cross-sells)
   * 
   * For now, we'll leave Upsells empty as they're not the same as optional bundle items
   * If needed, these can be handled separately or ignored
   */
  private parseUpsells(upsells?: string): string {
    // Upsells are NOT optional bundle items - they're just suggestions
    // Leaving empty for now - can be handled separately if needed
    return '';
  }

  /**
   * Infer variation type using pattern matching
   */
  private inferVariationTypeFromPattern(attrName: string, values: string[]): string | null {
    const nameLower = attrName.toLowerCase();
    
    // Boolean detection - check attribute name
    const booleanKeywords = ['yes', 'no', 'on', 'off', 'enable', 'disable', 'include', 'exclude', 'add', 'remove', 'optional'];
    if (booleanKeywords.some(kw => nameLower.includes(kw))) {
      return 'boolean';
    }
    
    // Boolean detection - check if only 2 options match boolean pattern
    if (values.length === 2) {
      const valuesLower = values.map(v => v.toLowerCase().trim());
      const booleanPairs = [
        ['yes', 'no'], ['on', 'off'], ['include', 'exclude'],
        ['add', 'remove'], ['enable', 'disable'], ['with', 'without']
      ];
      if (booleanPairs.some(pair => 
        (valuesLower.includes(pair[0]) && valuesLower.includes(pair[1]))
      )) {
        return 'boolean';
      }
    }
    
    // Image detection - check attribute name
    const imageKeywords = ['color', 'colour', 'material', 'finish', 'pattern', 'style', 'design', 'appearance', 'look'];
    if (imageKeywords.some(kw => nameLower.includes(kw))) {
      return 'image';
    }
    
    // No pattern match found
    return null;
  }

  /**
   * Infer variation type using AI
   */
  private async inferVariationTypeWithAI(
    productName: string,
    attrName: string,
    values: string[]
  ): Promise<string> {
    if (!this.openai) {
      return 'dropdown'; // Fallback if OpenAI not available
    }

    const prompt = `Determine the variation type for this product attribute:

Product: ${productName}
Attribute Name: ${attrName}
Attribute Values: ${values.join(', ')}

Variation types:
- "image": For visual selections like colors, materials, finishes where each option typically has an image
- "boolean": For yes/no, on/off, include/exclude type selections (usually 2 options)
- "dropdown": For standard select dropdowns with multiple options

Return ONLY one word: "image", "boolean", or "dropdown"`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Return only one word: image, boolean, or dropdown.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 10,
      });

      const result = response.choices[0]?.message?.content?.trim().toLowerCase();
      if (result === 'image' || result === 'boolean' || result === 'dropdown') {
        this.stats.aiInferences++;
        return result;
      }
    } catch (error) {
      console.warn(`⚠️  AI inference failed for "${attrName}": ${error}`);
    }
    
    return 'dropdown'; // Fallback
  }

  /**
   * Infer variation type (pattern matching first, then AI)
   */
  private async inferVariationType(
    productName: string,
    attrName: string,
    values: string[]
  ): Promise<string> {
    // Try pattern matching first (fast, free)
    const patternMatch = this.inferVariationTypeFromPattern(attrName, values);
    if (patternMatch) {
      return patternMatch;
    }
    
    // Use AI for ambiguous cases
    return await this.inferVariationTypeWithAI(productName, attrName, values);
  }

  /**
   * Transform simple product to our CSV format
   */
  private async transformSimpleProduct(row: WordPressRow): Promise<OurCSVRow> {
    // Handle stock correctly: empty stock + "In stock?" = "1" means unlimited
    const stockStr = row['Stock']?.trim() || '';
    const inStock = row['In stock?']?.trim() || '';
    let stock: string;
    let inStockValue: string;
    
    if (stockStr === '') {
      // Empty stock field
      if (inStock === '1') {
        // Stock not managed but in stock = use large number to indicate unlimited
        stock = '999999';
        inStockValue = '1';
      } else {
        // Stock not managed but out of stock = 0
        stock = '0';
        inStockValue = '0';
      }
    } else {
      // Has stock value - use as-is
      stock = stockStr;
      inStockValue = inStock || (parseInt(stockStr) > 0 ? '1' : '0');
    }
    
    return {
      sku: row['SKU']?.trim() || '',
      name: row['Name']?.trim() || '',
      regular_price: row['Regular price']?.trim() || '0',
      type: 'simple',
      status: this.mapStatus(row),
      description: await this.extractTextFromHTML(row['Description']),
      short_description: await this.extractTextFromHTML(row['Short description'] || ''),
      featured: row['Is featured?'] === '1' ? 'true' : 'false',
      sale_price: row['Sale price']?.trim() || '',
      is_on_sale: row['Sale price'] && parseFloat(row['Sale price']) > 0 ? 'true' : 'false',
      sale_start_date: row['Date sale price starts'] ? new Date(row['Date sale price starts']).toISOString() : '',
      sale_end_date: row['Date sale price ends'] ? new Date(row['Date sale price ends']).toISOString() : '',
      stock: stock,
      in_stock: inStockValue,
      weight_lbs: row['Weight (lbs)'] || '',
      length_in: row['Length (in)'] || '',
      width_in: row['Width (in)'] || '',
      height_in: row['Height (in)'] || '',
      tax_class: row['Tax class'] || '',
      shipping_class: row['Shipping class'] || '',
      categories: this.parseCategories(row['Categories']),
      tags: this.parseTags(row['Tags']),
      brands: row['Brands'] || '',
      gtin_upc_ean_isbn: row['GTIN, UPC, EAN, or ISBN'] || '',
      published: row['Published'] || '',
      visibility_in_catalog: row['Visibility in catalog'] || '',
      tax_status: row['Tax status'] || '',
      backorders_allowed: row['Backorders allowed?'] || '',
      sold_individually: row['Sold individually?'] || '',
      allow_customer_reviews: row['Allow customer reviews?'] || '',
      purchase_note: row['Purchase note'] || '',
      product_images: this.parseImages(row['Images']),
      product_bundle_items: this.parseCrossSells(
        row['Cross-sells'], 
        row['SKU']?.trim(),
        row['Description']
      ),
      is_bundle: (row['Cross-sells']?.trim() || 
                  this.extractProductLinksFromDescription(row['Description'] || '').length > 0) 
                 ? 'true' : 'false',
      low_stock_amount: row['Low stock amount'] || '',
      region: 'us',
      package_weight: row['Weight (lbs)'] || '',
      package_weight_unit: row['Weight (lbs)'] ? 'lbs' : '',
      package_length: row['Length (in)'] || '',
      package_width: row['Width (in)'] || '',
      package_height: row['Height (in)'] || '',
      package_dimension_unit: (row['Length (in)'] || row['Width (in)'] || row['Height (in)']) ? 'in' : '',
      tariff_code: '', // Left empty - to be set manually in admin
    };
  }

  /**
   * Generate our CSV format
   */
  async generateOurCSV(outputPath: string): Promise<void> {
    console.log('\n🔄 Transforming products...\n');

    const rows: OurCSVRow[] = [];

    // Transform variable products in parallel (with concurrency limit to avoid overwhelming API)
    const variableProductEntries = Array.from(this.variableProducts.entries());
    const CONCURRENCY_LIMIT = 20; // Process 5 products at a time to avoid rate limits
    
    for (let i = 0; i < variableProductEntries.length; i += CONCURRENCY_LIMIT) {
      const batch = variableProductEntries.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(
        batch.map(async ([sku, variableProduct]) => {
          console.log(`📦 Transforming variable product: ${sku}`);
          return await this.transformVariableProduct(variableProduct);
        })
      );
      rows.push(...batchResults);
    }

    // Transform simple products (synchronous, fast)
    for (const simpleProduct of this.simpleProducts) {
      const row = await this.transformSimpleProduct(simpleProduct);
      rows.push(row);
    }

    // Write CSV
    await this.writeCSV(rows, outputPath);

    // Print stats
    console.log('\n📊 Transformation Statistics:');
    console.log(`  Total products processed: ${this.stats.totalProducts}`);
    console.log(`  Variable products: ${this.stats.variableProducts}`);
    console.log(`  Simple products: ${this.stats.simpleProducts}`);
    console.log(`  Variations processed: ${this.stats.variationsProcessed}`);
    console.log(`  SKU parses: ${this.stats.skuParses}`);
    console.log(`  Name parses: ${this.stats.nameParses}`);
    console.log(`  AI inferences: ${this.stats.aiInferences}`);
    if (this.stats.groupedProductsSkipped > 0) {
      console.log(`  Grouped products skipped: ${this.stats.groupedProductsSkipped}`);
    }
    console.log(`\n✅ Output written to: ${outputPath}`);
  }

  /**
   * Write CSV file
   */
  private async writeCSV(rows: OurCSVRow[], outputPath: string): Promise<void> {
    if (rows.length === 0) {
      throw new Error('No rows to write');
    }

    // Get all unique keys
    const allKeys = new Set<string>();
    rows.forEach(row => {
      Object.keys(row).forEach(key => allKeys.add(key));
    });

    // Sort headers (required fields first)
    const headers = Array.from(allKeys).sort((a, b) => {
      const required = ['sku', 'name', 'regular_price'];
      const aIndex = required.indexOf(a);
      const bIndex = required.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    // Write CSV
    const writeStream = createWriteStream(outputPath);
    
    // Write header
    writeStream.write(headers.map(h => this.escapeCSV(h)).join(',') + '\n');

    // Write rows
    for (const row of rows) {
      const values = headers.map(h => this.escapeCSV(String(row[h] || '')));
      writeStream.write(values.join(',') + '\n');
    }

    writeStream.end();

    return new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  /**
   * Escape CSV value
   */
  private escapeCSV(value: string): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('Usage: ts-node transform-wordpress.ts <input-csv> [output-csv]');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1] || inputPath.replace('.csv', '_transformed.csv');

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ Input file not found: ${inputPath}`);
    process.exit(1);
  }

  console.log(`📥 Reading WordPress CSV: ${inputPath}`);
  console.log(`📤 Output will be written to: ${outputPath}\n`);

  const transformer = new WordPressTransformer();
  
  try {
    await transformer.parseWordPressCSV(inputPath);
    await transformer.generateOurCSV(outputPath);
    console.log('\n✅ Transformation complete!');
  } catch (error) {
    console.error('\n❌ Transformation failed:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { WordPressTransformer };

