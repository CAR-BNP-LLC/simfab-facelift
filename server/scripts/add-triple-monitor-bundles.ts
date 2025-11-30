import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

type Row = Record<string, string>;

const TARGET_SKU = 'triple-monitor-stand';

const bundleItems = [
  {
    item_sku: 'simfab-overhead-submount-monitor-mount-bracket-kit',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Overhead or Sub-Mount Monitor Bracket Kit',
    sort_order: 0
  },
  {
    item_sku: 'front-surround-speaker-tray',
    quantity: 1,
    item_type: 'optional',
    is_configurable: false,
    price_adjustment: 0,
    display_name: 'Front Surround Speaker Tray Kit Monitor Mount Systems',
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

async function readCanonicalVariations(productsPath: string): Promise<string> {
  const fileContents = fs.readFileSync(productsPath, 'utf8');
  let canonical: string | null = null;

  await new Promise<void>((resolve, reject) => {
    const stream = Readable.from([fileContents]);
    stream
      .pipe(csv())
      .on('data', (data: Row) => {
        if (data.sku === TARGET_SKU) {
          canonical = data.product_variations || '';
        }
      })
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err));
  });

  if (!canonical) {
    throw new Error(`Could not find product_variations for "${TARGET_SKU}" in ${productsPath}`);
  }

  return canonical;
}

async function processCsvFile(filePath: string, variationsJson: string) {
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
      row.product_variations = variationsJson;
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

  const canonicalVariations = await readCanonicalVariations(productsTransformedPath);

  await processCsvFile(productsTransformedPath, canonicalVariations);
  await processCsvFile(wcExportTransformedPath, canonicalVariations);
}

main().catch((err) => {
  console.error('Error during triple monitor bundles CSV update:', err);
  process.exit(1);
});


