import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

type Row = Record<string, string>;

const CATEGORY_REPLACEMENTS: Record<string, string> = {
  'recommended-complete-setups-by-type-aircraft': 'bundles',
  'recommended-complete-setups-by-brand-controls': 'bundles'
};

function toCsvValue(value: string | undefined): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

async function main() {
  const wcExportPath = path.resolve(__dirname, '..', '..', 'temp', 'wc-product-export-transformed.csv');

  const fileContents = fs.readFileSync(wcExportPath, 'utf8');
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
    console.error(`No data read from ${wcExportPath}`);
    process.exit(1);
  }

  if (!headers.includes('sku') || !headers.includes('categories')) {
    console.error(`Expected columns "sku" and "categories" not found in CSV header of ${wcExportPath}`);
    process.exit(1);
  }

  let changed = false;

  // Fix invalid categories
  for (const row of rows) {
    const original = row.categories;
    if (!original) continue;

    const delimiter = original.includes('|') ? '|' : ',';
    const parts = original.split(delimiter).map((p) => p.trim()).filter(Boolean);

    let rowChanged = false;
    const mapped = parts.map((cat) => {
      const replacement = CATEGORY_REPLACEMENTS[cat];
      if (replacement) {
        rowChanged = true;
        return replacement;
      }
      return cat;
    });

    if (rowChanged) {
      row.categories = mapped.join(delimiter);
      changed = true;
    }
  }

  // Remove any rows without a SKU (e.g., the row 106 error)
  const filteredRows = rows.filter((row) => {
    const hasSku = row.sku && row.sku.trim().length > 0;
    if (!hasSku) {
      changed = true;
    }
    return hasSku;
  });

  if (!changed) {
    console.log(`No import-related changes were necessary in ${path.basename(wcExportPath)}.`);
    return;
  }

  const outLines: string[] = [];
  outLines.push(headers.map(toCsvValue).join(','));

  for (const row of filteredRows) {
    const values = headers.map((h) => toCsvValue(row[h]));
    outLines.push(values.join(','));
  }

  fs.writeFileSync(wcExportPath, outLines.join('\n'), 'utf8');

  console.log(
    `Applied import-error fixes to ${filteredRows.length} data row(s) in ${path.basename(wcExportPath)} (invalid categories replaced, empty-SKU rows removed).`
  );
}

main().catch((err) => {
  console.error('Error during import error fixes:', err);
  process.exit(1);
});


