import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

type Row = Record<string, string>;

const TARGET_SKU = 'articulating-arm-tray';

const bundleItems = [
  {
    item_sku: 'round-tray-for-active-articulating-arm',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Round Tray for Active Articulating Arm',
    sort_order: 0
  },
  {
    item_sku: 'cup-holder',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Cup Holder Add-on To Keyboard Tray Kit With Articulating Arm',
    sort_order: 1
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

  if (!headers.includes('sku') || !headers.includes('product_bundle_items')) {
    console.error(
      `Expected columns "sku" and "product_bundle_items" not found in CSV header of ${filePath}`
    );
    return;
  }

  let updatedCount = 0;

  for (const row of rows) {
    if (row.sku === TARGET_SKU) {
      row.product_bundle_items = JSON.stringify(bundleItems);
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
    `Updated product_bundle_items for ${updatedCount} row(s) with sku "${TARGET_SKU}" in ${path.basename(
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
  console.error('Error during articulating arm bundles CSV update:', err);
  process.exit(1);
});


