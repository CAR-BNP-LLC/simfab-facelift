import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';

type Row = Record<string, string>;

const TARGET_SKU = 'trainer-station';

const bundleItems = [
  {
    item_sku: 'articulating-arm-tray',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Active Articulating Arm with Keyboard & Mouse or Laptop Tray kit',
    sort_order: 0,
  },
  {
    item_sku: 'single-monitor-stand',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'SimFab Single Monitor Mount Stand for Flight Sim & Sim Racing',
    sort_order: 1,
  },
  {
    item_sku: 'triple-monitor-stand',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'SimFab Triple Monitor Mount Stand for Flight Sim & Sim Racing',
    sort_order: 2,
  },
  {
    item_sku: 'front-surround-speaker-tray',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Front Surround Speaker Tray Kit Monitor Mount Systems',
    sort_order: 3,
  },
  {
    item_sku: 'armrest-kit',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Armrest Kit',
    sort_order: 4,
  },
  {
    item_sku: 'simfab-rear-surround-speaker-tray-kit',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Rear Surround Speaker Tray Kit',
    sort_order: 5,
  },
  {
    item_sku: 'neck-pillow',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Neck Pillow for Racing & Flight Sim Cockpits',
    sort_order: 6,
  },
  {
    item_sku: 'umbar-pillow',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Lumbar Pillow for Racing & Flight Sim Cockpits',
    sort_order: 7,
  },
];

function toCsvValue(value: string | undefined): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function readTrainerVariations(csvPath: string): Promise<string | undefined> {
  if (!fs.existsSync(csvPath)) {
    return undefined;
  }

  return new Promise<string | undefined>((resolve, reject) => {
    let found: string | undefined;

    fs.createReadStream(csvPath)
      .pipe(csv())
      .on('data', (data: Row) => {
        if (!found && data.sku === TARGET_SKU && typeof data.product_variations === 'string') {
          found = data.product_variations;
        }
      })
      .on('end', () => resolve(found))
      .on('error', (err: Error) => reject(err));
  });
}

async function updateCsvFile(csvPath: string, fileName: string, trainerVariations?: string) {
  if (!fs.existsSync(csvPath)) {
    console.warn(`${fileName} not found at ${csvPath}, skipping...`);
    return 0;
  }

  const rows: Row[] = [];
  const headers: string[] = [];

  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(csvPath);

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
    console.warn(`No data read from ${fileName}`);
    return 0;
  }

  if (!headers.includes('sku')) {
    console.warn(`Expected column "sku" not found in ${fileName}, skipping...`);
    return 0;
  }

  let updatedCount = 0;

  for (const row of rows) {
    if (row.sku === TARGET_SKU) {
      // Always update bundle items if the column exists
      if (headers.includes('product_bundle_items')) {
        row.product_bundle_items = JSON.stringify(bundleItems);
      }

      // If we have a source of truth for variations, mirror it into this file
      if (trainerVariations && headers.includes('product_variations')) {
        row.product_variations = trainerVariations;
      }

      updatedCount += 1;
    }
  }

  if (updatedCount === 0) {
    console.warn(`No rows found with sku "${TARGET_SKU}" in ${fileName}.`);
    return 0;
  }

  const outLines: string[] = [];
  outLines.push(headers.join(','));

  for (const row of rows) {
    const values = headers.map((h) => toCsvValue(row[h]));
    outLines.push(values.join(','));
  }

  fs.writeFileSync(csvPath, outLines.join('\n'), 'utf8');

  console.log(`Updated product_bundle_items for ${updatedCount} row(s) with sku "${TARGET_SKU}" in ${fileName}.`);
  return updatedCount;
}

async function main() {
  const csvPath1 = path.resolve(__dirname, '..', '..', 'products-transformed.csv');
  const csvPath2 = path.resolve(__dirname, '..', '..', 'temp', 'wc-product-export-transformed.csv');

  // Read the canonical trainer-station variations from products-transformed.csv
  const trainerVariations = await readTrainerVariations(csvPath1);
  if (!trainerVariations) {
    console.warn(
      `Could not find product_variations for sku "${TARGET_SKU}" in products-transformed.csv. Variations will not be synced.`
    );
  }

  const count1 = await updateCsvFile(csvPath1, 'products-transformed.csv', trainerVariations);
  const count2 = await updateCsvFile(csvPath2, 'temp/wc-product-export-transformed.csv', trainerVariations);

  const total = count1 + count2;
  if (total === 0) {
    console.warn(`No rows found with sku "${TARGET_SKU}" in any file.`);
  } else {
    console.log(`\nTotal: Updated ${total} row(s) across all files.`);
  }
}

main().catch((err) => {
  console.error('Error updating products-transformed.csv:', err);
  process.exit(1);
});


