# WordPress Migration: Unhandled Fields Summary

## ✅ What's Fully Handled (90%+)

The transformation script successfully handles:
- ✅ All core product fields (SKU, name, prices, descriptions, etc.)
- ✅ Variations transformation with AI inference
- ✅ Price adjustments per option
- ✅ Stock tracking (minimum per option)
- ✅ Images conversion (comma-separated → JSON array)
- ✅ Tags/categories formatting
- ✅ Sale dates conversion
- ✅ Physical attributes (weight, dimensions)
- ✅ Tax and shipping fields

## ❌ What's Left Unhandled

### 1. High Priority - Should Add

#### `low_stock_amount`
- **WordPress Field**: `Low stock amount`
- **Our Field**: `low_stock_amount`
- **Status**: ✅ **HANDLED**
- **Implementation**: Direct mapping for both simple and variable products. Uses product-level value from WordPress.

#### `price_min` / `price_max`
- **WordPress Source**: Variation prices
- **Our Field**: `price_min`, `price_max`
- **Status**: ⏸️ **INTENTIONALLY DEFERRED** - Will be calculated later
- **Impact**: Price range not shown on product pages initially
- **Note**: Will be calculated post-import or in a separate process

#### `seo_description`
- **WordPress Source**: `Meta: _yoast_wpseo_metadesc`
- **Our Field**: `seo_description`
- **Status**: ⏸️ **INTENTIONALLY DEFERRED** - Part of meta fields rework
- **Impact**: SEO meta descriptions not imported initially
- **Note**: Will be handled as part of meta fields rework

#### `region`
- **Current**: Hardcoded to 'us'
- **Our Field**: `region`
- **Status**: ⏸️ **INTENTIONALLY LEFT AS-IS** - Will be handled manually
- **Impact**: All products imported as US region initially
- **Note**: Region will be set manually or in post-processing

#### Upsells → Optional Bundle Items
- **WordPress Field**: `Upsells` (comma-separated SKUs)
- **Our Field**: `is_bundle`, `product_bundle_items`
- **Status**: ✅ **HANDLED**
- **Implementation**: Upsells are parsed and converted to optional bundle items. Products with upsells have `is_bundle: true`.

### 2. Medium Priority - Nice to Have

#### `sale_label`
- **WordPress Source**: N/A (we have field but WordPress doesn't)
- **Our Field**: `sale_label`
- **Status**: Not set
- **Impact**: No custom sale labels
- **Fix**: Leave empty or generate from sale price percentage.

#### `slug`
- **WordPress Source**: N/A (we generate from name)
- **Our Field**: `slug`
- **Status**: Not generated in CSV
- **Impact**: Slugs auto-generated on import (probably fine)
- **Fix**: Generate slug from name in script if needed.

#### `product_group_id`
- **WordPress Source**: N/A (we use this for US/EU grouping)
- **Our Field**: `product_group_id`
- **Status**: Not set
- **Impact**: Can't link US/EU versions
- **Fix**: Would need logic to identify and group US/EU products.

#### Meta Fields Consolidation
- **WordPress Source**: 100+ `Meta:` fields
- **Our Field**: `meta_data` (JSON)
- **Status**: ⏸️ **INTENTIONALLY DEFERRED** - Will be reworked anyway
- **Impact**: Plugin-specific data not imported initially
- **Note**: Meta fields will be reworked/consolidated in a separate process

### 3. Low Priority - WordPress Doesn't Have (Manual Entry Required)

#### `product_faqs`
- **WordPress Source**: ❌ **NOT IN CSV** - WordPress doesn't export FAQs in standard WooCommerce CSV
- **Our Field**: `product_faqs` (JSON array)
- **Status**: ⚠️ **MUST BE LEFT BLANK** - Will be empty after import
- **Impact**: FAQs need manual entry via admin UI after import
- **Note**: These fields are not present in WordPress CSV export, so they will be empty/omitted in the transformed CSV.

#### `product_description_components` (Product Page Builder)
- **WordPress Source**: ❌ **NOT IN CSV** - Fusion Builder content is in `Description` field but not exportable as structured components
- **Our Field**: `product_description_components` (JSON array) - Note: This field is not currently in CSV import/export
- **Status**: ⚠️ **MUST BE LEFT BLANK** - Will be empty after import
- **Impact**: Product page builder content needs manual entry via admin UI after import
- **Note**: WordPress uses Fusion Builder shortcodes in `Description`, but this structured builder content is not exported in CSV. The raw HTML/shortcodes remain in `description` field, but builder components must be created manually.

#### `assembly_manuals`
- **WordPress Source**: ❌ **NOT IN CSV** - WordPress doesn't have this structure
- **Our Field**: `assembly_manuals` (JSON array)
- **Status**: ⚠️ **MUST BE LEFT BLANK** - Will be empty after import
- **Impact**: Manuals need manual entry via admin UI after import
- **Note**: These fields are not present in WordPress CSV export, so they will be empty/omitted in the transformed CSV.

#### `product_additional_info`
- **WordPress Source**: ❌ **NOT IN CSV** - WordPress doesn't have this structure
- **Our Field**: `product_additional_info` (JSON array)
- **Status**: ⚠️ **MUST BE LEFT BLANK** - Will be empty after import
- **Impact**: Additional info needs manual entry via admin UI after import
- **Note**: These fields are not present in WordPress CSV export, so they will be empty/omitted in the transformed CSV.

### 4. ✅ Now Handled

#### `Attribute X visible`
- **WordPress Field**: `Attribute 1/2/3 visible`
- **Our Field**: N/A
- **Status**: ✅ **HANDLED**
- **Implementation**: Invisible attributes (`visible='0'` or `'false'`) are skipped during parsing. Only visible attributes create variations.

#### Variation Type Inference
- **Our Field**: `variation_type`
- **Status**: ✅ **HANDLED**
- **Implementation**: 
  - **Pattern Matching** (fast, free): Detects `boolean` (yes/no, include/exclude patterns), `image` (color, material, style keywords), defaults to `dropdown`
  - **AI Inference** (for ambiguous cases): Uses OpenAI GPT-4o-mini when pattern matching doesn't match
  - Falls back to `dropdown` if AI unavailable

#### Grouped Products
- **WordPress Field**: `Type=grouped`
- **Status**: ✅ **HANDLED** (skipped with error logging)
- **Implementation**: Grouped products are detected, skipped, and logged as errors for future reference. This ensures they won't cause silent failures in future imports.

## 📊 Impact Assessment

### Critical (Blocks Functionality)
- None - core functionality works

### Important (Affects User Experience)
1. ✅ `low_stock_amount` - ✅ HANDLED (direct mapping)

### Intentionally Deferred (Will Handle Later)
2. `price_min`/`price_max` - Will calculate later
3. `seo_description` - Part of meta fields rework
4. `region` - Will set manually
5. Meta fields - Will rework separately

### Nice to Have (Enhancements)
6. `sale_label`
7. `slug` generation
8. Grouped products (if different from upsells)

### Manual Entry Required (WordPress CSV Doesn't Have These)
9. ✅ FAQs (`product_faqs`) - ❌ Not in WordPress CSV, leave blank
10. ✅ Product Description Builder (`product_description_components`) - ❌ Not in WordPress CSV, leave blank  
11. ✅ Assembly manuals (`assembly_manuals`) - ❌ Not in WordPress CSV, leave blank
12. ✅ Product additional info (`product_additional_info`) - ❌ Not in WordPress CSV, leave blank

## 🔧 Recommended Implementation Order

1. ✅ **Quick Wins** (COMPLETED):
   - ✅ Add `low_stock_amount` mapping
   - ✅ Check `Attribute X visible` flag
   - ✅ Variation type inference (pattern + AI)
   - ✅ Grouped products handling (skip with error)

2. **Deferred** (Will handle separately):
   - Calculate `price_min`/`price_max` - deferred
   - Extract `seo_description` from meta - deferred (part of meta rework)
   - Make `region` configurable - deferred (will set manually)
   - Consolidate meta fields - deferred (will rework separately)

3. **Complex** (1-2 hours):
   - Handle grouped products (if needed, separate from upsells)

4. **Future Enhancements**:
   - Variation type inference
   - Product grouping logic
   - Slug generation

## ✅ Current Status

**Handled**: ~90% of essential fields
**Unhandled**: ~10% (mostly enhancements and WordPress-specific features)

The transformation script is **production-ready** for core product migration. The unhandled items are either:
- Non-critical enhancements
- Features WordPress doesn't have
- Can be added manually or in post-processing

