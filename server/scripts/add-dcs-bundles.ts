import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

type Row = Record<string, string>;

const TARGET_SKU = 'dcs-cockpit';

// Optional add-on plates for DCS cockpit
const NEW_BUNDLE_ITEMS = [
  {
    item_sku: 'plate-a-large',
    quantity: 1,
    item_type: 'optional' as const,
    is_configurable: false,
    // Base plate price is 29.99; DCS page shows 24.99 as add-on → -5 discount
    price_adjustment: -5,
    display_name: 'Large Universal Flight Plate (Plate A)',
    description:
      'Large universal adapter plate A for horizontal mounting on either side of the seat. Doubles as a mouse tray and includes a matching square mouse pad, mounting hardware, and supports a wide range of HOTAS controls.',
    sort_order: 1
  },
  {
    item_sku: 'plate-j-vp',
    quantity: 1,
    item_type: 'optional' as const,
    is_configurable: false,
    // Same deal pricing: 29.99 → 24.99 when bought with the cockpit
    price_adjustment: -5,
    display_name: 'Flight controls VP plate #J',
    description:
      'Adapter plate type J for VKB Gladiator NXT EVO sticks, Virpil control panels and throttles, and Winwing Ursa sticks. Designed for horizontal mounting and supplied with full mounting hardware for all supported controls.',
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

function mergeBundleItems(existingJson: string | undefined): string {
  let existing: any[] = [];
  if (existingJson) {
    try {
      const parsed = JSON.parse(existingJson);
      if (Array.isArray(parsed)) {
        // Filter out legacy HOTAS kit (#4-kit) which should not appear as an add-on
        existing = parsed.filter(
          (item) => !(item && typeof item === 'object' && item.item_sku === '#4-kit')
        );
      }
    } catch {
      // If parsing fails, treat as empty and overwrite with our items
      existing = [];
    }
  }

  const existingSkus = new Set<string>(
    existing.map((item) => (item && typeof item === 'object' ? item.item_sku : null)).filter(Boolean)
  );

  const merged = [...existing];
  for (const item of NEW_BUNDLE_ITEMS) {
    if (!existingSkus.has(item.item_sku)) {
      merged.push(item);
    }
  }

  return JSON.stringify(merged);
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
      row.product_bundle_items = mergeBundleItems(row.product_bundle_items);
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
  console.error('Error during DCS bundles CSV update:', err);
  process.exit(1);
});


