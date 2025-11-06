# WordPress CSV Transformation Script

This script transforms WordPress/WooCommerce CSV exports into our system's CSV import format.

## Features

- ✅ Groups variable products with their variations
- ✅ Uses OpenAI to infer attribute values from variations (with fallback to SKU/name parsing)
- ✅ Calculates price adjustments per option
- ✅ Uses minimum stock per option (Option C - conservative approach)
- ✅ Handles simple products
- ✅ Converts images from comma-separated to JSON array
- ✅ Maps all WordPress fields to our format

## Setup

1. **Install dependencies:**
   ```bash
   cd server
   npm install
   ```

2. **Set up OpenAI API key:**
   
   Add to `server/.env`:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ```
   
   The script will work without OpenAI (using SKU/name parsing only), but AI inference provides better accuracy.

## Usage

```bash
# Basic usage
cd server
ts-node scripts/transform-wordpress.ts <input-csv-file> [output-csv-file]

# Example
ts-node scripts/transform-wordpress.ts ../wc-product-export-16-9-2025-1758050942025.csv ../products-transformed.csv
```

If no output file is specified, it will create `*_transformed.csv` next to the input file.

## How It Works

### 1. Parsing WordPress CSV
- Reads WordPress CSV export
- Groups variable products (Type=variable) with their variations (Type=variation)
- Processes simple products separately

### 2. Attribute Value Inference
For each variation, tries three methods in order:

1. **SKU Parsing** (fast, free)
   - Looks for attribute values in SKU
   - Example: `dd-black` → Color: "Black"

2. **Name Parsing** (fast, free)
   - Extracts attribute values from variation name
   - Removes parent name and matches remaining text

3. **OpenAI Inference** (accurate, requires API key)
   - Uses GPT-4o-mini to analyze variation and infer attributes
   - Falls back to parsing if OpenAI is unavailable

### 3. Price Calculation
- Finds minimum variation price → sets as `regular_price`
- Calculates `price_adjustment` per option:
  - If all variations have same price → all adjustments = 0
  - If prices vary → calculates average adjustment per option

### 4. Stock Calculation (Option C - Minimum)
- For each option, finds minimum stock across all variations containing that option
- Conservative approach: won't oversell
- Sets `tracks_stock: true` on variations

### 5. Output Format
- Generates CSV in our import format
- Variations stored as JSON in `product_variations` column
- Images converted from comma-separated to JSON array
- All WordPress fields mapped to our fields

## Example Transformation

### WordPress Input:
```
Variable Product:
  SKU: sim-racing-dd
  Attribute 1: Color = Black, Blue, Red
  Attribute 2: Size = Small, Large

Variations:
  dd-black-small: Price=699, Stock=10
  dd-black-large: Price=749, Stock=5
  dd-blue-small: Price=699, Stock=8
  dd-blue-large: Price=749, Stock=12
```

### Our Output:
```csv
sku,name,regular_price,product_variations,...
sim-racing-dd,SimFab DD...,699,"[{""variation_type"":""dropdown"",""name"":""Color"",""options"":[{""option_name"":""Black"",""price_adjustment"":0,""stock_quantity"":5,...}]}]",...
```

## Statistics

The script prints statistics after transformation:
- Total products processed
- Variable products found
- Simple products found
- Variations processed
- SKU parses (successful)
- Name parses (successful)
- AI inferences (used)

## Troubleshooting

### OpenAI API Errors
- Check your API key is correct
- Ensure you have credits in your OpenAI account
- Script will fall back to SKU/name parsing if AI fails

### Missing Attribute Values
- Check that variations have SKUs or descriptive names
- Review the statistics to see how many used AI inference
- Consider improving SKU/name patterns if many use AI

### Price Adjustments
- If all variations have same price, all adjustments will be 0
- Price differences are averaged per option
- Check the generated CSV to verify adjustments

### Stock Issues
- Minimum stock approach is conservative
- May show "out of stock" when some combinations available
- Consider reviewing stock after import

## Next Steps

After transformation:
1. Review the generated CSV
2. Validate a few products manually
3. Import using our CSV import system
4. Verify products appear correctly
5. Check stock levels
6. Test price calculations

