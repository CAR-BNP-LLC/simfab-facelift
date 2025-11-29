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

async function main() {
  const csvPath = path.resolve(__dirname, '..', '..', 'products-transformed.csv');

  if (!fs.existsSync(csvPath)) {
    console.error(`products-transformed.csv not found at ${csvPath}`);
    process.exit(1);
  }

  const fileContents = fs.readFileSync(csvPath, 'utf8');

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
    console.error('No data read from products-transformed.csv');
    process.exit(1);
  }

  if (!headers.includes('sku') || !headers.includes('product_bundle_items')) {
    console.error('Expected columns "sku" and "product_bundle_items" not found in CSV header');
    process.exit(1);
  }

  let updatedCount = 0;

  for (const row of rows) {
    if (row.sku === TARGET_SKU) {
      row.product_bundle_items = JSON.stringify(bundleItems);
      updatedCount += 1;
    }
  }

  if (updatedCount === 0) {
    console.warn(`No rows found with sku "${TARGET_SKU}". No changes made.`);
    return;
  }

  const outLines: string[] = [];
  outLines.push(headers.join(','));

  for (const row of rows) {
    const values = headers.map((h) => toCsvValue(row[h]));
    outLines.push(values.join(','));
  }

  fs.writeFileSync(csvPath, outLines.join('\n'), 'utf8');

  console.log(`Updated product_bundle_items for ${updatedCount} row(s) with sku "${TARGET_SKU}".`);
}

main().catch((err) => {
  console.error('Error updating products-transformed.csv:', err);
  process.exit(1);
});


