import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

type Row = Record<string, string>;

const TARGET_SKU = 'single-monitor-stand';

// Image variation for LD/HD models + Yes/No add-ons for LD/HD components
const productVariations = [
  {
    variation_type: 'image',
    name: 'Select Monitor Mount Stand',
    is_required: true,
    tracks_stock: true,
    sort_order: 0,
    options: [
      {
        option_name: 'Model LD',
        option_value: 'Model LD',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2024/01/simfab-single-monitor-stand-model-LD.webp',
        is_default: true,
        sort_order: 0,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_available: true
      },
      {
        option_name: 'Model HD',
        option_value: 'Model HD',
        // HD model is price-neutral; both variants share the same base price
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2024/01/simfab-single-monitor-stand-model-HD.webp',
        is_default: false,
        sort_order: 1,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_available: true
      }
    ]
  },
  {
    // Add-on matching "Add LD components..." checkbox (Yes/No add-on, $15)
    variation_type: 'dropdown',
    name: 'Add LD components...',
    is_required: false,
    tracks_stock: false,
    sort_order: 1,
    options: [
      {
        option_name: 'No',
        option_value: 'No',
        price_adjustment: 0,
        is_default: true,
        sort_order: 0,
        stock_quantity: null,
        low_stock_threshold: null,
        is_available: true
      },
      {
        option_name: 'Yes',
        option_value: 'Yes',
        price_adjustment: 15,
        is_default: false,
        sort_order: 1,
        stock_quantity: null,
        low_stock_threshold: null,
        is_available: true
      }
    ]
  },
  {
    // Add-on matching "Add HD components..." checkbox (Yes/No add-on, $15)
    variation_type: 'dropdown',
    name: 'Add HD components...',
    is_required: false,
    tracks_stock: false,
    sort_order: 2,
    options: [
      {
        option_name: 'No',
        option_value: 'No',
        price_adjustment: 0,
        is_default: true,
        sort_order: 0,
        stock_quantity: null,
        low_stock_threshold: null,
        is_available: true
      },
      {
        option_name: 'Yes',
        option_value: 'Yes',
        price_adjustment: 15,
        is_default: false,
        sort_order: 1,
        stock_quantity: null,
        low_stock_threshold: null,
        is_available: true
      }
    ]
  },
  {
    // Add-on matching "Add optional Extension Kit" (Yes/No add-on, $69)
    // Rendered as a checkbox-style card in the "Selection Options" section
    variation_type: 'dropdown',
    name: 'Add optional Extension Kit',
    is_required: false,
    tracks_stock: false,
    sort_order: 3,
    options: [
      {
        option_name: 'No',
        option_value: 'No',
        price_adjustment: 0,
        is_default: true,
        sort_order: 0,
        stock_quantity: null,
        low_stock_threshold: null,
        is_available: true
      },
      {
        option_name: 'Yes',
        option_value: 'Yes',
        price_adjustment: 69,
        is_default: false,
        sort_order: 1,
        stock_quantity: null,
        low_stock_threshold: null,
        is_available: true
      }
    ]
  }
];

// Optional add-ons for this product
const bundleItems = [
  {
    // Height adjustment extension kit used for this stand
    item_sku: 'monitor-stand-extension-kit-ld',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Monitor & TV Stand Height Adjustment Extension Kit',
    sort_order: 0
  },
  {
    item_sku: 'simfab-overhead-submount-monitor-mount-bracket-kit',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Overhead or Sub-Mount Monitor Bracket Kit',
    sort_order: 1
  },
  {
    item_sku: 'front-surround-speaker-tray',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Front Surround Speaker Tray Kit Monitor Mount Systems',
    sort_order: 2
  }
];

function toCsvValue(value: string | undefined): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function processCsvFile(filePath: string) {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const rows: Row[] = [];
  const headers: string[] = [];

  await new Promise<void>((resolve, reject) => {
    const stream = Readable.from([fileContents]);
    stream
      .pipe(csv())
      .on('headers', (h: string[]) => {
        headers.push(...h);
      })
      .on('data', (data: Row) => {
        rows.push(data);
      })
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err));
  });

  if (!headers.length || !rows.length) {
    console.error(`No data read from ${filePath}`);
    return;
  }

  if (
    !headers.includes('sku') ||
    !headers.includes('product_bundle_items') ||
    !headers.includes('product_variations')
  ) {
    console.error(
      `Expected columns "sku", "product_bundle_items", and "product_variations" not found in CSV header of ${filePath}`
    );
    return;
  }

  let updatedCount = 0;

  for (const row of rows) {
    if (row.sku === TARGET_SKU) {
      row.product_bundle_items = JSON.stringify(bundleItems);
      row.product_variations = JSON.stringify(productVariations);
      updatedCount += 1;
    }
  }

  const outLines: string[] = [];
  outLines.push(headers.map(toCsvValue).join(','));

  for (const row of rows) {
    const values = headers.map((h) => toCsvValue(row[h]));
    outLines.push(values.join(','));
  }

  fs.writeFileSync(filePath, outLines.join('\n'), 'utf8');

  console.log(
    `Updated product_bundle_items and product_variations for ${updatedCount} row(s) with sku "${TARGET_SKU}" in ${path.basename(
      filePath
    )}.`
  );
}

async function main() {
  const productsTransformedPath = path.resolve(__dirname, '..', '..', 'products-transformed.csv');
  const wcExportTransformedPath = path.resolve(
    __dirname,
    '..',
    '..',
    'temp',
    'wc-product-export-transformed.csv'
  );

  await processCsvFile(productsTransformedPath);
  await processCsvFile(wcExportTransformedPath);
}

main().catch((err) => {
  console.error('Error during single monitor bundles/variations CSV update:', err);
  process.exit(1);
});


