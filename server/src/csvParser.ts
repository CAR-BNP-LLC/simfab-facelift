import csv from 'csv-parser';
import { Readable } from 'stream';
import { Product } from './database';

export interface CSVProduct {
  ID?: string;
  Type?: string;
  SKU: string;
  'GTIN, UPC, EAN, or ISBN'?: string;
  Name: string;
  Published?: string;
  'Is featured?'?: string;
  'Visibility in catalog'?: string;
  'Short description'?: string;
  Description?: string;
  'Date sale price starts'?: string;
  'Date sale price ends'?: string;
  'Tax status'?: string;
  'Tax class'?: string;
  'In stock?'?: string;
  Stock?: string;
  'Low stock amount'?: string;
  'Backorders allowed?'?: string;
  'Sold individually?'?: string;
  'Weight (lbs)'?: string;
  'Length (in)'?: string;
  'Width (in)'?: string;
  'Height (in)'?: string;
  'Allow customer reviews?'?: string;
  'Purchase note'?: string;
  'Sale price'?: string;
  'Regular price'?: string;
  Categories?: string;
  Tags?: string;
  'Shipping class'?: string;
  Images?: string;
  Brands?: string;
}

export async function parseCSV(csvData: string): Promise<CSVProduct[]> {
  return new Promise((resolve, reject) => {
    const results: CSVProduct[] = [];
    const stream = Readable.from([csvData]);

    stream
      .pipe(csv())
      .on('data', (data: CSVProduct) => {
        results.push(data);
      })
      .on('end', () => {
        resolve(results);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

export function validateCSVProduct(csvProduct: CSVProduct): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!csvProduct.Name || csvProduct.Name.trim() === '') {
    errors.push('Name is required');
  }

  if (!csvProduct.SKU || csvProduct.SKU.trim() === '') {
    errors.push('SKU is required');
  }

  // Validate numeric fields if they exist
  if (csvProduct.Stock && csvProduct.Stock.trim() !== '' && isNaN(parseInt(csvProduct.Stock))) {
    errors.push('Stock must be a valid integer');
  }

  if (csvProduct['Regular price'] && csvProduct['Regular price'].trim() !== '' && isNaN(parseFloat(csvProduct['Regular price']))) {
    errors.push('Regular price must be a valid number');
  }

  if (csvProduct['Sale price'] && csvProduct['Sale price'].trim() !== '' && isNaN(parseFloat(csvProduct['Sale price']))) {
    errors.push('Sale price must be a valid number');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function convertCSVToProduct(csvProduct: CSVProduct): Omit<Product, 'id' | 'created_at' | 'updated_at'> {
  return {
    type: csvProduct.Type?.trim() || undefined,
    sku: csvProduct.SKU.trim(),
    gtin_upc_ean_isbn: csvProduct['GTIN, UPC, EAN, or ISBN']?.trim() || undefined,
    name: csvProduct.Name.trim(),
    published: csvProduct.Published?.trim() || undefined,
    is_featured: csvProduct['Is featured?']?.trim() || undefined,
    visibility_in_catalog: csvProduct['Visibility in catalog']?.trim() || undefined,
    short_description: csvProduct['Short description']?.trim() || undefined,
    description: csvProduct.Description?.trim() || undefined,
    date_sale_price_starts: csvProduct['Date sale price starts']?.trim() || undefined,
    date_sale_price_ends: csvProduct['Date sale price ends']?.trim() || undefined,
    tax_status: csvProduct['Tax status']?.trim() || undefined,
    tax_class: csvProduct['Tax class']?.trim() || undefined,
    in_stock: csvProduct['In stock?']?.trim() || undefined,
    stock: csvProduct.Stock ? parseInt(csvProduct.Stock) : undefined,
    low_stock_amount: csvProduct['Low stock amount'] ? parseInt(csvProduct['Low stock amount']) : undefined,
    backorders_allowed: csvProduct['Backorders allowed?']?.trim() || undefined,
    sold_individually: csvProduct['Sold individually?']?.trim() || undefined,
    weight_lbs: csvProduct['Weight (lbs)'] ? parseFloat(csvProduct['Weight (lbs)']) : undefined,
    length_in: csvProduct['Length (in)'] ? parseFloat(csvProduct['Length (in)']) : undefined,
    width_in: csvProduct['Width (in)'] ? parseFloat(csvProduct['Width (in)']) : undefined,
    height_in: csvProduct['Height (in)'] ? parseFloat(csvProduct['Height (in)']) : undefined,
    allow_customer_reviews: csvProduct['Allow customer reviews?']?.trim() || undefined,
    purchase_note: csvProduct['Purchase note']?.trim() || undefined,
    sale_price: csvProduct['Sale price'] ? parseFloat(csvProduct['Sale price']) : undefined,
    regular_price: csvProduct['Regular price'] ? parseFloat(csvProduct['Regular price']) : undefined,
    categories: csvProduct.Categories?.trim() || undefined,
    tags: csvProduct.Tags?.trim() || undefined,
    shipping_class: csvProduct['Shipping class']?.trim() || undefined,
    images: csvProduct.Images?.trim() || undefined,
    brands: csvProduct.Brands?.trim() || undefined
  };
}
