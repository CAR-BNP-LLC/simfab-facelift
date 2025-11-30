import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

type Row = Record<string, string>;

function toCsvValue(value: string | undefined): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function cleanDescription(text: string | undefined): string | undefined {
  if (!text) return text;

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');

  const isManualPreviewLine = (line: string): boolean => {
    const trimmed = line.trim();
    if (!trimmed) return false;

    // "Assembly Manual" section heading
    if (trimmed === 'Assembly Manual') return true;

    // Old-site preview image URLs like:
    // https://simfab.com/wp-content/uploads/2024/02/10.Harness-manual-web.jpg
    // or with extra text after the jpg
    if (
      /https:\/\/simfab\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/.*manual-web\.jpg/i.test(
        trimmed
      )
    ) {
      return true;
    }

    // "see manual" helper text
    if (trimmed.toLowerCase() === 'see manual') return true;

    return false;
  };

  const filteredLines = lines.filter((line) => !isManualPreviewLine(line));

  // Optionally collapse runs of 3+ blank lines down to 2 for neatness
  const collapsed: string[] = [];
  let blankRun = 0;
  for (const line of filteredLines) {
    if (line.trim() === '') {
      blankRun += 1;
      if (blankRun <= 2) {
        collapsed.push(line);
      }
    } else {
      blankRun = 0;
      collapsed.push(line);
    }
  }

  return collapsed.join('\n');
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

  if (!headers.includes('description') && !headers.includes('short_description')) {
    console.error(
      `Expected columns "description" or "short_description" not found in CSV header of ${filePath}`
    );
    return;
  }

  let updatedCount = 0;

  for (const row of rows) {
    const beforeDescription = row.description;
    const beforeShortDescription = row.short_description;

    const afterDescription = cleanDescription(beforeDescription);
    const afterShortDescription = cleanDescription(beforeShortDescription);

    if (afterDescription !== beforeDescription) {
      row.description = afterDescription ?? '';
      updatedCount += 1;
    }

    if (afterShortDescription !== beforeShortDescription) {
      row.short_description = afterShortDescription ?? '';
      // Only increment once per row for logging clarity
      if (afterDescription === beforeDescription) {
        updatedCount += 1;
      }
    }
  }

  if (!updatedCount) {
    console.log(
      `No rows required manual-preview cleanup in ${path.basename(filePath)} (no "manual-web" blocks found).`
    );
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
    `Cleaned assembly manual preview blocks in ${updatedCount} field(s) in ${path.basename(
      filePath
    )}.`
  );
}

async function main() {
  const rootDir = path.resolve(__dirname, '..', '..');

  const productsTransformedPath = path.resolve(rootDir, 'products-transformed.csv');
  const wcExportTransformedPath = path.resolve(
    rootDir,
    'temp',
    'wc-product-export-transformed.csv'
  );

  await processCsvFile(productsTransformedPath);
  await processCsvFile(wcExportTransformedPath);
}

main().catch((err) => {
  console.error('Error during assembly manual preview cleanup:', err);
  process.exit(1);
});


