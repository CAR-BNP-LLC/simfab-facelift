import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

type Row = Record<string, string>;

const TARGET_SKU = 'msfs-cockpit-cockpit-standard';

function toCsvValue(value: string | undefined): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function readVariationsFromProducts(productsPath: string, sku: string): Promise<string> {
  const fileContents = fs.readFileSync(productsPath, 'utf8');
  let variationsJson: string | null = null;

  await new Promise<void>((resolve, reject) => {
    const stream = Readable.from([fileContents]);
    stream
      .pipe(csv())
      .on('data', (data: Row) => {
        if (data.sku === sku) {
          variationsJson = data.product_variations || '';
        }
      })
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err));
  });

  if (!variationsJson) {
    throw new Error(`Could not find product_variations for sku "${sku}" in ${productsPath}`);
  }

  return variationsJson;
}

async function writeVariationsToWcExport(wcPath: string, sku: string, variationsJson: string) {
  const fileContents = fs.readFileSync(wcPath, 'utf8');
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
    throw new Error(`No data read from ${wcPath}`);
  }

  if (!headers.includes('sku') || !headers.includes('product_variations')) {
    throw new Error(
      `Expected columns "sku" and "product_variations" not found in CSV header of ${wcPath}`
    );
  }

  let updatedCount = 0;

  for (const row of rows) {
    if (row.sku === sku) {
      row.product_variations = variationsJson;
      updatedCount += 1;
    }
  }

  if (!updatedCount) {
    console.warn(`No rows found with sku "${sku}" in ${path.basename(wcPath)}.`);
    return;
  }

  const outLines: string[] = [];
  outLines.push(headers.map(toCsvValue).join(','));

  for (const row of rows) {
    const values = headers.map((h) => toCsvValue(row[h]));
    outLines.push(values.join(','));
  }

  fs.writeFileSync(wcPath, outLines.join('\n'), 'utf8');

  console.log(
    `Updated product_variations for ${updatedCount} row(s) with sku "${sku}" in ${path.basename(
      wcPath
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

  const variationsJson = await readVariationsFromProducts(productsTransformedPath, TARGET_SKU);
  console.log(
    `Read product_variations for "${TARGET_SKU}" from products-transformed.csv (length=${variationsJson.length}).`
  );

  await writeVariationsToWcExport(wcExportTransformedPath, TARGET_SKU, variationsJson);
}

main().catch((err) => {
  console.error('Error during MSFS cockpit sync to WC CSV:', err);
  process.exit(1);
});


