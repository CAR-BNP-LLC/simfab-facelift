# WordPress to Our System Field Mappings

This document maps WordPress/WooCommerce CSV export fields to our system's CSV import fields, and shows what's handled by the transformation script.

## ✅ Fully Handled Fields (Implemented in Script)

| WordPress Field | Our Field | Status | Implementation Notes |
|----------------|-----------|--------|---------------------|
| `SKU` | `sku` | ✅ **HANDLED** | Direct mapping. Required field. |
| `Name` | `name` | ✅ **HANDLED** | Direct mapping. Required field. |
| `Regular price` | `regular_price` | ✅ **HANDLED** | For variable products: minimum variation price. For simple: direct mapping. |
| `Sale price` | `sale_price` | ✅ **HANDLED** | For variable products: minimum variation sale price. For simple: direct mapping. |
| `Is featured?` | `featured` | ✅ **HANDLED** | Converts "1"/"0" to "true"/"false". |
| `Description` | `description` | ✅ **HANDLED** | Direct mapping. |
| `Short description` | `short_description` | ✅ **HANDLED** | Direct mapping. |
| `Date sale price starts` | `sale_start_date` | ✅ **HANDLED** | Converts to ISO 8601 format. |
| `Date sale price ends` | `sale_end_date` | ✅ **HANDLED** | Converts to ISO 8601 format. |
| `Tax status` | `tax_status` | ✅ **HANDLED** | Direct mapping. |
| `Tax class` | `tax_class` | ✅ **HANDLED** | Direct mapping. |
| `Stock` | `stock` | ✅ **HANDLED** | For variable products: sum of all variation stocks. For simple: direct mapping. |
| `In stock?` | `in_stock` | ✅ **HANDLED** | For variable products: calculated from total stock. For simple: direct mapping. |
| `Weight (lbs)` | `weight_lbs` | ✅ **HANDLED** | Direct mapping. |
| `Length (in)` | `length_in` | ✅ **HANDLED** | Direct mapping. |
| `Width (in)` | `width_in` | ✅ **HANDLED** | Direct mapping. |
| `Height (in)` | `height_in` | ✅ **HANDLED** | Direct mapping. |
| `Allow customer reviews?` | `allow_customer_reviews` | ✅ **HANDLED** | Direct mapping. |
| `Purchase note` | `purchase_note` | ✅ **HANDLED** | Direct mapping. |
| `Categories` | `categories` | ✅ **HANDLED** | Takes first category if comma-separated. |
| `Tags` | `tags` | ✅ **HANDLED** | Converts comma-separated to pipe-delimited. |
| `Shipping class` | `shipping_class` | ✅ **HANDLED** | Direct mapping. |
| `Brands` | `brands` | ✅ **HANDLED** | Direct mapping. |
| `GTIN, UPC, EAN, or ISBN` | `gtin_upc_ean_isbn` | ✅ **HANDLED** | Direct mapping. |
| `Published` | `published` | ✅ **HANDLED** | Direct mapping. |
| `Visibility in catalog` | `visibility_in_catalog` | ✅ **HANDLED** | Direct mapping. |
| `Backorders allowed?` | `backorders_allowed` | ✅ **HANDLED** | Direct mapping. |
| `Sold individually?` | `sold_individually` | ✅ **HANDLED** | Direct mapping. |
| `Images` | `product_images` | ✅ **HANDLED** | Converts comma-separated URLs to JSON array format. |
| `Type` | `type` | ✅ **HANDLED** | Variable products → "simple" (variations in JSON). Simple products → "simple". |
| `Published` | `status` | ✅ **HANDLED** | "1" → "active", otherwise → "draft". |
| `Sale price` | `is_on_sale` | ✅ **HANDLED** | Calculated: true if sale_price exists and > 0. |

### Variations/Attributes (Complex Transformation)

| WordPress Field | Our Field | Status | Implementation Notes |
|----------------|-----------|--------|---------------------|
| `Attribute 1/2/3 name` | `product_variations` (variation `name`) | ✅ **HANDLED** | Each attribute becomes a variation. |
| `Attribute 1/2/3 value(s)` | `product_variations` (variation `options`) | ✅ **HANDLED** | Values become options. Parses comma/pipe-separated. |
| Variation products (Type=variation) | `product_variations` (options with stock/prices) | ✅ **HANDLED** | Uses OpenAI/SKU/name parsing to infer attribute values. Calculates price adjustments and minimum stock per option. |
| `Attribute 1/2/3 default` | `product_variations` (option `is_default`) | ✅ **HANDLED** | WordPress default value is used to set `is_default: true` on matching option. Falls back to first option if no default specified. |
| `Attribute X visible` | N/A | ✅ **HANDLED** | Invisible attributes (visible='0' or 'false') are skipped. Only visible attributes create variations. |
| `Attribute X global` | N/A | ✅ **IGNORED** | Correctly ignored (we don't support global attributes). |

**Variation Type:** Inferred using pattern matching (fast) + AI (for ambiguous cases). ✅ **HANDLED**
- **Pattern Matching**: Detects `boolean` (yes/no, include/exclude patterns), `image` (color, material, style keywords), defaults to `dropdown`
- **AI Inference**: Uses OpenAI GPT-4o-mini for ambiguous cases when pattern matching doesn't match

## ⚠️ Partially Handled / Missing Fields

| WordPress Field | Our Field | Status | Notes |
|----------------|-----------|--------|-------|
| `Low stock amount` | `low_stock_amount` | ✅ **HANDLED** | Direct mapping for both simple and variable products. Uses product-level value from WordPress. |
| `Sale price` + dates | `sale_label` | ⏸️ **DEFERRED** | We have this field but WordPress doesn't. Will be set later. |
| Variation prices | `price_min` / `price_max` | ⏸️ **DEFERRED** | Will be calculated later in post-processing. |
| `Meta: _yoast_wpseo_metadesc` | `seo_description` | ⏸️ **DEFERRED** | Part of meta fields rework - will be handled separately. |
| `Meta: _yoast_wpseo_primary_product_cat` | `categories` | ⏸️ **DEFERRED** | Part of meta fields rework - will be handled separately. |
| Various `Meta:` fields | `meta_data` | ⏸️ **DEFERRED** | Meta fields will be reworked/consolidated separately. |
| `Grouped products` | N/A | ⚠️ **SKIPPED WITH ERROR** | Grouped products (`Type=grouped`) are detected and skipped with error logging. Not supported in current system. |
| `Type=grouped` | N/A | ⚠️ **SKIPPED WITH ERROR** | Grouped products are skipped and logged as errors for future reference. |
| N/A | `slug` | ❌ **NOT GENERATED** | We auto-generate from name in our system, but not in CSV. |
| N/A | `region` | ⏸️ **INTENTIONALLY LEFT** | Hardcoded to 'us'. Will be set manually or in post-processing. |
| N/A | `product_group_id` | ❌ **NOT HANDLED** | Not set. Would need manual assignment or logic to group US/EU products. |
| N/A | `product_faqs` | ⚠️ **NOT IN WORDPRESS CSV** | WordPress doesn't export FAQs in standard WooCommerce CSV. Field will be empty/omitted. Must be added manually via admin UI after import. |
| N/A | `product_description_components` | ⚠️ **NOT IN WORDPRESS CSV** | WordPress uses Fusion Builder shortcodes in `Description`, but structured builder components are not exported. Field will be empty/omitted. Must be created manually via admin UI after import. |
| N/A | `assembly_manuals` | ⚠️ **NOT IN WORDPRESS CSV** | WordPress doesn't export assembly manuals. Field will be empty/omitted. Must be added manually via admin UI after import. |
| N/A | `product_additional_info` | ⚠️ **NOT IN WORDPRESS CSV** | WordPress doesn't export additional info. Field will be empty/omitted. Must be added manually via admin UI after import. |

## ❌ Fields That Don't Map (Correctly Ignored)

| WordPress Field | Our Equivalent | Status | Reason |
|----------------|----------------|--------|--------|
| `ID` | N/A | ✅ **IGNORED** | WordPress internal ID. We use SKU+region. |
| `Parent` | N/A | ✅ **USED** | Used to group variations with variable products, then ignored in output. |
| `Upsells` | `product_bundle_items` (optional items) | ✅ **HANDLED** | Upsells are mapped to optional bundle items (`item_type: 'optional'`). Sets `is_bundle: true` if upsells exist. |
| `Cross-sells` | N/A | ✅ **IGNORED** | We don't have cross-sell functionality. |
| `External URL` | N/A | ✅ **IGNORED** | We don't support external products. |
| `Button text` | N/A | ✅ **IGNORED** | We don't support external products. |
| `Position` | N/A | ✅ **IGNORED** | We don't use position ordering for products. |
| `Download limit` | N/A | ✅ **IGNORED** | We don't support downloadable products. |
| `Download expiry days` | N/A | ✅ **IGNORED** | We don't support downloadable products. |
| All `Meta:` fields | N/A | ✅ **IGNORED** | Plugin-specific metadata. Could be extracted but not implemented. |

## 📋 Summary: What's Left Unhandled

### High Priority (Should Consider Adding)

1. **`low_stock_amount`** - WordPress field exists, should map directly
2. **`price_min` / `price_max`** - Could calculate from variation prices
3. **`seo_description`** - Could extract from `Meta: _yoast_wpseo_metadesc`
4. **`region`** - Currently hardcoded to 'us', should be configurable
5. **Grouped Products** - WordPress "grouped" products could map to our bundles

### Medium Priority (Nice to Have)

6. **`sale_label`** - We have this field, could generate or leave empty
7. **`slug`** - Could generate from name in script
8. **`product_group_id`** - Would need logic to group US/EU versions
9. **Meta fields extraction** - Could consolidate important meta fields into `meta_data` JSON

### Low Priority (WordPress Doesn't Have - Manual Entry Required)

10. **`product_faqs`** - ❌ Not in WordPress CSV export. Leave blank, add manually via admin UI.
11. **`product_description_components`** - ❌ Not in WordPress CSV export. Fusion Builder content is in `Description` but not exportable as structured components. Leave blank, create manually via admin UI.
12. **`assembly_manuals`** - ❌ Not in WordPress CSV export. Leave blank, add manually via admin UI.
13. **`product_additional_info`** - ❌ Not in WordPress CSV export. Leave blank, add manually via admin UI.

### Already Handled ✅

14. **`Attribute X default`** - ✅ Uses WordPress default value to set `is_default` flag.
15. **`Attribute X visible`** - ✅ Invisible attributes are skipped (not created as variations).
16. **Variation type inference** - ✅ Uses pattern matching + AI to infer `image`, `boolean`, or `dropdown`.

## 🔧 Recommended Next Steps

1. ✅ **Add `low_stock_amount` mapping** - ✅ DONE
2. ⏸️ **Calculate `price_min`/`price_max`** - Deferred (will calculate later)
3. ⏸️ **Extract SEO fields from meta** - Deferred (part of meta rework)
4. ⏸️ **Make `region` configurable** - Deferred (will set manually)
5. ✅ **Handle grouped products** - ✅ DONE (skipped with error logging)
6. ✅ **Use `Attribute X default`** - ✅ DONE
7. ✅ **Check `Attribute X visible`** - ✅ DONE
8. ✅ **Variation type inference** - ✅ DONE (pattern matching + AI)

## ✅ What's Working Well

- ✅ All core product fields mapped
- ✅ Variations transformation working (with AI inference)
- ✅ Price adjustments calculated correctly
- ✅ Stock tracking implemented (minimum per option)
- ✅ Images converted to JSON format
- ✅ Tags/categories formatted correctly
- ✅ Sale dates converted to ISO format

The transformation script handles **~90% of the essential fields**. The remaining items are either:
- WordPress-specific features we don't need
- Nice-to-have enhancements
- Fields that require additional logic or manual input
