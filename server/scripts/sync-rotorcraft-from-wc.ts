import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

type Row = Record<string, string>;

const TARGET_SKU = 'rotorcraft-edition-cockpit';

function toCsvValue(value: string | undefined): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function readRowBySku(filePath: string, sku: string): Promise<Row | null> {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  let result: Row | null = null;

  await new Promise<void>((resolve, reject) => {
    const rows: Row[] = [];
    const stream = Readable.from([fileContents]);

    stream
      .pipe(csv())
      .on('data', (data: Row) => {
        rows.push(data);
        if (!result && data.sku === sku) {
          result = data;
        }
      })
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err));
  });

  return result;
}

async function updateProductsTransformedFromWc() {
  const wcExportPath = path.resolve(__dirname, '..', '..', 'temp', 'wc-product-export-transformed.csv');
  const productsTransformedPath = path.resolve(__dirname, '..', '..', 'products-transformed.csv');

  console.log(`Reading source data for "${TARGET_SKU}" from ${wcExportPath}`);
  const sourceRow = await readRowBySku(wcExportPath, TARGET_SKU);

  if (!sourceRow) {
    console.error(`Could not find sku "${TARGET_SKU}" in ${wcExportPath}`);
    process.exit(1);
  }

  const sourceBundleItems = sourceRow.product_bundle_items ?? '';
  const sourceVariations = sourceRow.product_variations ?? '';

  if (!sourceVariations) {
    console.error(
      `Row for sku "${TARGET_SKU}" in ${wcExportPath} does not contain product_variations. Nothing to sync.`
    );
    process.exit(1);
  }

  console.log('Found source product_variations length:', sourceVariations.length);
  console.log('Found source product_bundle_items length:', sourceBundleItems.length);

  const fileContents = fs.readFileSync(productsTransformedPath, 'utf8');
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
    console.error(`No data read from ${productsTransformedPath}`);
    process.exit(1);
  }

  if (!headers.includes('sku') || !headers.includes('product_bundle_items') || !headers.includes('product_variations')) {
    console.error(
      `Expected columns "sku", "product_bundle_items", and "product_variations" not found in CSV header of ${productsTransformedPath}`
    );
    process.exit(1);
  }

  let updatedCount = 0;

  for (const row of rows) {
    if (row.sku === TARGET_SKU) {
      row.product_bundle_items = sourceBundleItems;
      row.product_variations = sourceVariations;
      updatedCount += 1;
    }
  }

  if (updatedCount === 0) {
    console.warn(`No rows found with sku "${TARGET_SKU}" in ${productsTransformedPath}. No changes made.`);
    return;
  }

  const outLines: string[] = [];
  outLines.push(headers.map(toCsvValue).join(','));

  for (const row of rows) {
    const values = headers.map((h) => toCsvValue(row[h]));
    outLines.push(values.join(','));
  }

  fs.writeFileSync(productsTransformedPath, outLines.join('\n'), 'utf8');
  console.log(
    `Updated product_bundle_items and product_variations for ${updatedCount} row(s) with sku "${TARGET_SKU}" in ${path.basename(
      productsTransformedPath
    )}.`
  );
}

updateProductsTransformedFromWc().catch((err) => {
  console.error('Error during rotorcraft CSV sync:', err);
  process.exit(1);
});


