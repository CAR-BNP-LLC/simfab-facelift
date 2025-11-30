import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

type Row = Record<string, string>;

const TARGET_SKU = 'dd-cockpit';

// Image variations for seat color and pedal plate
const productVariations = [
  {
    variation_type: 'image',
    name: 'Choose Seat Color',
    is_required: true,
    tracks_stock: true,
    sort_order: 0,
    options: [
      {
        option_name: 'Black',
        option_value: 'Black',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2022/11/simfab-dd-modular-racing-sim-cockpit-black.webp',
        is_default: true,
        sort_order: 0,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_available: true
      },
      {
        option_name: 'Blue',
        option_value: 'Blue',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2022/11/simfab-dd-modular-racing-sim-cockpit-blue.webp',
        is_default: false,
        sort_order: 1,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_available: true
      },
      {
        option_name: 'Gray',
        option_value: 'Gray',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2025/01/simfab-dd-modular-racing-sim-cockpit-grey.webp',
        is_default: false,
        sort_order: 2,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_available: true
      },
      {
        option_name: 'Green',
        option_value: 'Green',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2022/11/simfab-dd-modular-racing-sim-cockpit-green.webp',
        is_default: false,
        sort_order: 3,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_available: true
      },
      {
        option_name: 'Olive Green',
        option_value: 'Olive Green',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2025/01/simfab-dd-modular-racing-sim-cockpit-military-green.webp',
        is_default: false,
        sort_order: 4,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_available: true
      },
      {
        option_name: 'Orange',
        option_value: 'Orange',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2022/11/simfab-dd-modular-racing-sim-cockpit-orange.webp',
        is_default: false,
        sort_order: 5,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_available: true
      },
      {
        option_name: 'Red',
        option_value: 'Red',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2022/11/simfab-dd-modular-racing-sim-cockpit-red.webp',
        is_default: false,
        sort_order: 6,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_available: true
      },
      {
        option_name: 'Yellow',
        option_value: 'Yellow',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2022/11/simfab-dd-modular-racing-sim-cockpit-yellow.webp',
        is_default: false,
        sort_order: 7,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_available: true
      }
    ]
  },
  {
    variation_type: 'image',
    name: 'Choose pedal plate',
    is_required: true,
    tracks_stock: true,
    sort_order: 1,
    options: [
      {
        option_name: 'Angled pedal plate',
        option_value: 'Angled pedal plate',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2022/11/simfab-dd-modular-racing-sim-cockpit-angeled-pedal-plate.webp',
        is_default: true,
        sort_order: 0,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_available: true
      },
      {
        option_name: 'Flat pedal plate',
        option_value: 'Flat pedal plate',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2022/11/simfab-dd-modular-racing-sim-cockpit-flat-pedal-plate.webp',
        is_default: false,
        sort_order: 1,
        stock_quantity: 0,
        low_stock_threshold: 0,
        is_available: true
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

  if (!headers.includes('sku') || !headers.includes('product_variations')) {
    console.error(
      `Expected columns "sku" and "product_variations" not found in CSV header of ${filePath}`
    );
    return;
  }

  let updatedCount = 0;

  for (const row of rows) {
    if (row.sku === TARGET_SKU) {
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
    `Updated product_variations for ${updatedCount} row(s) with sku "${TARGET_SKU}" in ${path.basename(
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
  console.error('Error during dd-cockpit variations CSV update:', err);
  process.exit(1);
});


