import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

type Row = Record<string, string>;

const TARGET_SKU = 'gen3-cockpit';

const bundleItems = [
  {
    item_sku: 'front-surround-speaker-tray',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Front Surround Speaker Tray Kit Monitor Mount Systems',
    sort_order: 1
  },
  {
    item_sku: 'footrest-simracing',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Sim Racing Pedal Plate Foot Rest',
    sort_order: 2
  },
  {
    item_sku: 'simfab-rear-surround-speaker-tray-kit',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Rear Surround Speaker Tray Kit',
    sort_order: 3
  }
];

// Variations for OpenWheeler GEN3 Racing Cockpit
const variations = [
  {
    variation_type: 'image',
    name: 'Choose Seat Color',
    is_required: true,
    tracks_stock: false,
    sort_order: 0,
    options: [
      {
        option_name: 'Black',
        option_value: 'Black',
        price_adjustment: 0,
        image_url: 'https://simfab.com/wp-content/uploads/2022/11/gen3-3-1.jpg',
        is_default: true,
        sort_order: 0
      },
      {
        option_name: 'Blue',
        option_value: 'Blue',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2022/11/1.blue_.main_.ow-seat-700x620-1.png',
        is_default: false,
        sort_order: 1
      },
      {
        option_name: 'Gray',
        option_value: 'Gray',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2025/01/800-grey-12-11-2022-IMG-1956.jpg',
        is_default: false,
        sort_order: 2
      },
      {
        option_name: 'Green',
        option_value: 'Green',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2022/11/1.green_.main_.ow-seat-700x620-1.png',
        is_default: false,
        sort_order: 3
      },
      {
        option_name: 'Olive Green',
        option_value: 'Olive Green',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2025/01/800-olive-green-12-11-2022-IMG-1956.jpg',
        is_default: false,
        sort_order: 4
      },
      {
        option_name: 'Orange',
        option_value: 'Orange',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2022/11/800-orange-12-11-2022-IMG-1956.jpg',
        is_default: false,
        sort_order: 5
      },
      {
        option_name: 'Red',
        option_value: 'Red',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2022/11/1.red_.main_.ow-seat-700x620-1.png',
        is_default: false,
        sort_order: 6
      },
      {
        option_name: 'Yellow',
        option_value: 'Yellow',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2022/11/1.yellow.main_.ow-seat-700x620-1.png',
        is_default: false,
        sort_order: 7
      }
    ]
  },
  {
    variation_type: 'dropdown',
    name: 'Choose pedal plate',
    is_required: true,
    tracks_stock: false,
    sort_order: 1,
    options: [
      {
        option_name: 'OpenWheeler GEN3 Racing Cockpit with default pedal plate',
        option_value: 'OpenWheeler GEN3 Racing Cockpit with default pedal plate',
        price_adjustment: 0,
        is_default: true,
        sort_order: 0
      },
      {
        option_name: 'OpenWheeler GEN3 Racing Cockpit with flat pedal plate',
        option_value: 'OpenWheeler GEN3 Racing Cockpit with flat pedal plate',
        price_adjustment: 0,
        is_default: false,
        sort_order: 1
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
  console.error('Error during GEN3 CSV update:', err);
  process.exit(1);
});


