import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

type Row = Record<string, string>;

const TARGET_SKU = 'dcs-cockpit';

function toCsvValue(value: string | undefined): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function ensureDcsSeatColorVariation(existingJson: string | undefined): string {
  let variations: any[] = [];

  if (existingJson) {
    try {
      const parsed = JSON.parse(existingJson);
      if (Array.isArray(parsed)) {
        variations = parsed;
      }
    } catch {
      variations = [];
    }
  }

  const hasSeatColor = variations.some(
    (v) =>
      v &&
      typeof v === 'object' &&
      v.variation_type === 'image' &&
      (v.name === 'Choose Seat Color (Removable Foam)' || v.name === 'Choose Seat Color')
  );

  if (hasSeatColor) {
    return existingJson || JSON.stringify(variations);
  }

  // Build seat color variation from dcs-edition-modular-flight-pit export
  const seatColorVariation = {
    variation_type: 'image',
    name: 'Choose Seat Color (Removable Foam)',
    is_required: true,
    tracks_stock: false,
    sort_order: 0,
    options: [
      {
        option_name: 'Black',
        option_value: 'Black',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/04/product-simfab-dcs-edition-modular-flight-pit.webp',
        is_default: true,
        sort_order: 0
      },
      {
        option_name: 'Blue',
        option_value: 'Blue',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/04/product-simfab-dcs-edition-modular-flight-pit-color-blue.webp',
        is_default: false,
        sort_order: 1
      },
      {
        option_name: 'Gray',
        option_value: 'Gray',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/04/product-simfab-dcs-edition-modular-flight-pit-color-grey.webp',
        is_default: false,
        sort_order: 2
      },
      {
        option_name: 'Green',
        option_value: 'Green',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/04/product-simfab-dcs-edition-modular-flight-pit-color-green.webp',
        is_default: false,
        sort_order: 3
      },
      {
        option_name: 'Olive Green',
        option_value: 'Olive Green',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/04/product-simfab-dcs-edition-modular-flight-pit-color-military-green.webp',
        is_default: false,
        sort_order: 4
      },
      {
        option_name: 'Orange',
        option_value: 'Orange',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/04/product-simfab-dcs-edition-modular-flight-pit-color-orange.webp',
        is_default: false,
        sort_order: 5
      },
      {
        option_name: 'Red',
        option_value: 'Red',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/04/product-simfab-dcs-edition-modular-flight-pit-color-red-2.webp',
        is_default: false,
        sort_order: 6
      },
      {
        option_name: 'Yellow',
        option_value: 'Yellow',
        price_adjustment: 0,
        image_url:
          'https://simfab.com/wp-content/uploads/2023/04/product-simfab-dcs-edition-modular-flight-pit-color-yellowwebp.webp',
        is_default: false,
        sort_order: 7
      }
    ]
  };

  // Bump sort_order of existing variations so seat color appears first
  variations.forEach((v) => {
    if (v && typeof v === 'object' && typeof v.sort_order === 'number') {
      v.sort_order += 1;
    }
  });

  const newVariations = [seatColorVariation, ...variations];
  return JSON.stringify(newVariations);
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

  if (!headers.includes('sku') || !headers.includes('product_variations')) {
    console.error(
      `Expected columns "sku" and "product_variations" not found in CSV header of ${filePath}`
    );
    return;
  }

  let updatedCount = 0;

  for (const row of rows) {
    if (row.sku === TARGET_SKU) {
      row.product_variations = ensureDcsSeatColorVariation(row.product_variations);
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
    `Updated product_variations (added DCS seat color) for ${updatedCount} row(s) with sku "${TARGET_SKU}" in ${path.basename(
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
  console.error('Error during DCS variations CSV update:', err);
  process.exit(1);
});


