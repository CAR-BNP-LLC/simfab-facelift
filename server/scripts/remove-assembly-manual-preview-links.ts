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

  // Match any SimFab inline image URLs that are pasted directly into the description,
  // e.g.:
  // https://simfab.com/wp-content/uploads/2024/01/SimFab-Triple-Monitor-...-parts.webp
  // https://simfab.com/wp-content/uploads/2024/02/10.Harness-manual-web.jpg
  const imageUrlRegex =
    /https:\/\/simfab\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/[^\s"]+\.(?:webp|jpe?g|png)/i;

  // Narrower matcher for "manual" preview images used to detect whole manual blocks
  // so we can also strip headings / labels around them when appropriate.
  const manualImageUrlRegex =
    /https:\/\/simfab\.com\/wp-content\/uploads\/\d{4}\/\d{2}\/.*manual.*\.(?:webp|jpe?g|png)/i;

  const manualUrlIndexes = lines
    .map((line, idx) => (manualImageUrlRegex.test(line.trim()) ? idx : -1))
    .filter((idx) => idx >= 0);

  const hasManualPreview = manualUrlIndexes.length > 0;

  const isNearManualUrl = (index: number): boolean =>
    manualUrlIndexes.some((i) => Math.abs(i - index) <= 3);

  const filteredLines = lines.filter((line, index) => {
    const trimmed = line.trim();

    // Always keep pure blank lines for now; we'll normalize later
    if (!trimmed) return true;

    // Remove any inline SimFab image URLs that are pasted directly in the text
    // (the actual product media is stored separately, we don't want raw URLs in descriptions)
    if (imageUrlRegex.test(trimmed)) {
      return false;
    }

    // Remove stand-alone "Assembly Manual" or "Assembly Manuals" headings
    // when they are part of a preview block near a manual image.
    if (/^Assembly Manuals?$/i.test(trimmed) && (hasManualPreview || isNearManualUrl(index))) {
      return false;
    }

    // Old "see manual" helper text
    if (trimmed.toLowerCase() === 'see manual' && (hasManualPreview || isNearManualUrl(index))) {
      return false;
    }

    // For lines that are very likely just labels under the manual preview image
    // (e.g., "Triple Monitor Mount Stand (HD)" / "(LD)"), remove them when they
    // are close to a manual image URL.
    if (
      hasManualPreview &&
      isNearManualUrl(index) &&
      /^[A-Z][A-Za-z0-9 '&()\-]{0,80}$/.test(trimmed)
    ) {
      return false;
    }

    return true;
  });

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

    let afterDescription = cleanDescription(beforeDescription);
    const afterShortDescription = cleanDescription(beforeShortDescription);

    // Targeted cleanup for Triple Monitor Mount Stand where an orphan label line
    // may remain at the very end of the description after image/link removal.
    if (row.sku === 'triple-monitor-stand' && afterDescription) {
      const patched = afterDescription.replace(/\n?Triple Monitor Mount Stand \(LD\)\s*$/, '');
      if (patched !== afterDescription) {
        afterDescription = patched;
      }
    }

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


