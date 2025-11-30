import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { Readable } from 'stream';

type Row = Record<string, string>;

const TARGET_SKU = 'rotorcraft-edition-cockpit';

// Names of rotorcraft add-on variations that should remain dropdowns (no image_url on options)
const ADDON_VARIATION_NAMES = [
  'Add rudder pedal plate upgrade base.',
  'Add keyboard tray kit with articulation',
  'Add Full Size Keyboard Tray (includes mouse tray)',
  'Add Compact Size Keyboard (includes mouse tray)',
  'Add Laptop Tray'
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

  if (!headers.includes('sku') || !headers.includes('product_variations')) {
    console.error(`Expected columns "sku" and "product_variations" not found in CSV header of ${wcExportPath}`);
    process.exit(1);
  }

  let updatedCount = 0;

  for (const row of rows) {
    if (row.sku !== TARGET_SKU) continue;

    if (!row.product_variations) {
      console.warn(`Row for sku "${TARGET_SKU}" has empty product_variations`);
      continue;
    }

    let variations: any[];
    try {
      variations = JSON.parse(row.product_variations);
      if (!Array.isArray(variations)) {
        console.error(`product_variations for "${TARGET_SKU}" is not an array`);
        continue;
      }
    } catch (err) {
      console.error(`Failed to parse product_variations JSON for "${TARGET_SKU}":`, err);
      continue;
    }

    let changed = false;

    for (const variation of variations) {
      // 1) Seat color images are included in price, so ensure no price adjustment
      if (variation.variation_type === 'image' && variation.name === 'Choose Seat Color (Removable Foam)') {
        if (Array.isArray(variation.options)) {
          for (const opt of variation.options) {
            if (opt && typeof opt === 'object') {
              if (opt.price_adjustment !== 0) {
                opt.price_adjustment = 0;
                changed = true;
              }
            }
          }
        }
      }

      // 2) Ensure rotorcraft add-on dropdowns have NO image_url on options,
      // because the importer converts dropdowns with images into image-type variations.
      if (variation.variation_type === 'dropdown' && ADDON_VARIATION_NAMES.includes(variation.name)) {
        if (Array.isArray(variation.options)) {
          for (const opt of variation.options) {
            if (opt && typeof opt === 'object' && 'image_url' in opt) {
              delete opt.image_url;
              changed = true;
            }
          }
        }
      }
    }

    // Remove legacy "Compatible with" image variation and separate center-stick bracket dropdown
    const beforeLength = variations.length;
    variations = variations.filter((v: any) => {
      const isOldCompatibleImage =
        v.variation_type === 'image' &&
        typeof v.name === 'string' &&
        v.name === 'Compatible with';

      const isOldCenterBracketDropdown =
        v.variation_type === 'dropdown' &&
        typeof v.name === 'string' &&
        v.name === 'Center stick bracket (for VirPil, WinWing Komodo controls)';

      return !isOldCompatibleImage && !isOldCenterBracketDropdown;
    });
    if (variations.length !== beforeLength) {
      changed = true;
    }

    // 3) Add combined compatibility + bracket dropdown if it doesn't exist yet
    const hasCompatBracketDropdown = variations.some(
      (v: any) =>
        v.variation_type === 'dropdown' &&
        typeof v.name === 'string' &&
        v.name === 'Compatibility & bracket selection'
    );

    if (!hasCompatBracketDropdown) {
      // Move existing dropdowns at/after sort_order 2 down, so this can sit near the top
      for (const variation of variations) {
        if (variation.variation_type === 'dropdown') {
          const so = typeof variation.sort_order === 'number' ? variation.sort_order : 0;
          if (so >= 2) {
            variation.sort_order = so + 1;
            changed = true;
          }
        }
      }

      const compatBracketDropdown = {
        variation_type: 'dropdown',
        name: 'Compatibility & bracket selection',
        description: null,
        is_required: true,
        tracks_stock: false,
        sort_order: 2,
        options: [
          {
            option_name: 'VirPil, WinWing Komodo controls with Standard center stick lower mount bracket',
            option_value: 'VirPil, WinWing Komodo controls with Standard center stick lower mount bracket',
            price_adjustment: 0,
            is_default: true,
            sort_order: 0
          },
          {
            option_name: 'VirPil, WinWing Komodo controls with Retrofit kit for Moza/Rhino',
            option_value: 'VirPil, WinWing Komodo controls with Retrofit kit for Moza/Rhino',
            price_adjustment: 0,
            is_default: false,
            sort_order: 1
          },
          {
            option_name: 'Dedicated Retrofit Airframe for Max Flight Stick Helicopter Controls',
            option_value: 'Dedicated Retrofit Airframe for Max Flight Stick Helicopter Controls',
            price_adjustment: 110,
            is_default: false,
            sort_order: 2
          }
        ]
      };

      variations.push(compatBracketDropdown);
      changed = true;
    }

    if (changed) {
      row.product_variations = JSON.stringify(variations);
      updatedCount += 1;
    }
  }

  if (!updatedCount) {
    console.log(`No changes made for sku "${TARGET_SKU}" in ${path.basename(wcExportPath)}.`);
    return;
  }

  const outLines: string[] = [];
  outLines.push(headers.map(toCsvValue).join(','));

  for (const row of rows) {
    const values = headers.map((h) => toCsvValue(row[h]));
    outLines.push(values.join(','));
  }

  fs.writeFileSync(wcExportPath, outLines.join('\n'), 'utf8');

  console.log(
    `Updated product_variations for ${updatedCount} row(s) with sku "${TARGET_SKU}" in ${path.basename(wcExportPath)}.`
  );
}

main().catch((err) => {
  console.error('Error during rotorcraft variations update:', err);
  process.exit(1);
});


