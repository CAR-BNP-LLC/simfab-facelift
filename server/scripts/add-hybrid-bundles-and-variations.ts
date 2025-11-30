import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

type Row = Record<string, string>;

const TARGET_SKU = 'hybrid-edition-cockpit';

// Optional adapter plates (bundle items) for Hybrid cockpit
const bundleItems = [
  {
    item_sku: 'plate-b-throttle',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    // Base plate price is 29.99; bundle price shown as 24.99, so -5 discount
    price_adjustment: -5,
    display_name: 'Medium Universal Flight Plate (Plate B)',
    sort_order: 0
  },
  {
    item_sku: 'plate-c-stick',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: -5,
    display_name: 'Small Universal Flight Plates Set (Plate C)',
    sort_order: 1
  },
  {
    item_sku: 'plate-d-mfd',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: -5,
    display_name: 'Medium Compact Universal Flight Plate (Plate D)',
    sort_order: 2
  },
  {
    item_sku: 'plate-j-vp',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: -5,
    display_name: 'Flight controls VP plate #J',
    sort_order: 3
  }
];

// Variations for SimFab Hybrid Flight Sim Modular Cockpit
const variations = [
  {
    variation_type: 'image',
    name: 'Choose Seat Color (Removable Foam)',
    is_required: true,
    tracks_stock: true,
    sort_order: 0,
    options: [
      {
        option_name: 'Black',
        option_value: 'Black',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/05/SimFab-Hybrid-Flight-Sim-Modular-Cockpit-black.webp',
        is_default: true,
        sort_order: 0
      },
      {
        option_name: 'Blue',
        option_value: 'Blue',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/05/SimFab-Hybrid-Flight-Sim-Modular-Cockpit-blue-HOTAS.webp',
        is_default: false,
        sort_order: 1
      },
      {
        option_name: 'Gray',
        option_value: 'Gray',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2024/05/SimFab-Hybrid-Flight-Sim-Modular-Cockpit-grey-HOTAS.webp',
        is_default: false,
        sort_order: 2
      },
      {
        option_name: 'Green',
        option_value: 'Green',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/05/SimFab-Hybrid-Flight-Sim-Modular-Cockpit-green-HOTAS.webp',
        is_default: false,
        sort_order: 3
      },
      {
        option_name: 'Olive Green',
        option_value: 'Olive Green',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2025/01/SimFab-Hybrid-Flight-Sim-Modular-Cockpit-military-green-HOTAS.webp',
        is_default: false,
        sort_order: 4
      },
      {
        option_name: 'Orange',
        option_value: 'Orange',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/05/SimFab-Hybrid-Flight-Sim-Modular-Cockpit-orange-HOTAS.webp',
        is_default: false,
        sort_order: 5
      },
      {
        option_name: 'Red',
        option_value: 'Red',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/05/SimFab-Hybrid-Flight-Sim-Modular-Cockpit-red0HOTAS.webp',
        is_default: false,
        sort_order: 6
      },
      {
        option_name: 'Yellow',
        option_value: 'Yellow',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/05/SimFab-Hybrid-Flight-Sim-Modular-Cockpit-yellow-HOTAS.webp',
        is_default: false,
        sort_order: 7
      }
    ]
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
      row.product_variations = JSON.stringify(variations);
      updatedCount += 1;
    }
  }

  if (!updatedCount) {
    console.warn(`No rows found with sku "${TARGET_SKU}" in ${path.basename(filePath)}.`);
    return;
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
  console.error('Error during Hybrid cockpit CSV update:', err);
  process.exit(1);
});


