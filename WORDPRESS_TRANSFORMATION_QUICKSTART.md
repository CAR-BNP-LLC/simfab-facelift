# WordPress CSV Transformation - Quick Start

## ✅ What's Been Created

1. **Transformation Script**: `server/scripts/transform-wordpress.ts`
   - Transforms WordPress CSV to our CSV format
   - Uses OpenAI for attribute inference
   - Calculates price adjustments
   - Uses minimum stock per option

2. **Documentation**: `server/scripts/README_TRANSFORM_WORDPRESS.md`
   - Full usage instructions
   - Troubleshooting guide

## 🚀 Quick Start

1. **Set up OpenAI API key** (optional but recommended):
   ```bash
   # Add to server/.env
   OPENAI_API_KEY=sk-your-key-here
   ```

2. **Run the transformation**:
   ```bash
   cd server
   ts-node scripts/transform-wordpress.ts ../wc-product-export-16-9-2025-1758050942025.csv ../products-transformed.csv
   ```

3. **Review the output**:
   - Check statistics printed at the end
   - Review a few products in the CSV
   - Verify attribute values were inferred correctly

4. **Import into our system**:
   - Use the CSV import dialog in admin panel
   - Start with validation mode
   - Then import

## 📊 What the Script Does

### For Variable Products:
1. Groups variations with their parent
2. Infers attribute values (SKU → Name → AI)
3. Calculates price adjustments per option
4. Calculates minimum stock per option
5. Builds `product_variations` JSON

### For Simple Products:
- Direct field mapping
- Image format conversion
- Tag/category parsing

## ⚙️ Configuration

The script uses:
- **Price Strategy**: Base price + adjustments per option ✅
- **Stock Strategy**: Minimum stock per option (Option C) ✅
- **Attribute Inference**: Hybrid (SKU → Name → OpenAI) ✅

## 🔍 Verification Steps

After transformation, check:
1. ✅ All variable products have `product_variations` JSON
2. ✅ Price adjustments are calculated correctly
3. ✅ Stock values are reasonable (minimum approach)
4. ✅ Attribute values match WordPress data
5. ✅ Images are in JSON array format

## 📝 Next Steps

1. Test with a small subset first
2. Review statistics (SKU parses vs AI inferences)
3. Adjust SKU/name patterns if too many use AI
4. Import and verify in admin panel
5. Test product display on frontend

