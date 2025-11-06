# CSV Import/Export Fields Reference

Complete reference of all fields available in the CSV import/export system, including data formats and purposes.

## Required Fields

| Field | Format | Purpose |
|-------|--------|---------|
| `sku` | String (alphanumeric) | **Required.** Unique product identifier per region. Used to identify products during import. Must be unique within the same region (US/EU). |
| `name` | String | **Required.** Product name/title displayed to customers. |
| `regular_price` | Decimal number (e.g., `99.99`) | **Required.** Base product price in the region's currency (USD for US, EUR for EU). Must be a valid number. |

## Basic Product Information

| Field | Format | Purpose |
|-------|--------|---------|
| `slug` | String (URL-friendly) | URL slug for the product page. Auto-generated from name if not provided. |
| `type` | String (`simple`, `bundle`, etc.) | Product type. Defaults to `simple` if not specified. |
| `status` | String (`active`, `inactive`, `draft`) | Product status. Controls visibility and availability. |
| `description` | String (multi-line text) | Full product description. Supports HTML formatting. |
| `short_description` | String | Brief product summary/excerpt. Used in product listings. |
| `featured` | Boolean (`true`/`false`) | Whether product is featured/promoted. Featured products may appear in special sections. |
| `is_bundle` | Boolean (`true`/`false`) | Whether product is a bundle containing multiple items. |

## Pricing Fields

| Field | Format | Purpose |
|-------|--------|---------|
| `sale_price` | Decimal number | Discounted price when on sale. Must be less than `regular_price`. |
| `is_on_sale` | Boolean (`true`/`false`) | Whether product is currently on sale. |
| `sale_start_date` | ISO 8601 date string (e.g., `2024-01-15T00:00:00.000Z`) | Start date for sale period. |
| `sale_end_date` | ISO 8601 date string | End date for sale period. |
| `sale_label` | String | Custom label/text displayed during sale (e.g., "50% Off", "Limited Time"). |
| `price_min` | Decimal number | Minimum price (for variable products with variations). |
| `price_max` | Decimal number | Maximum price (for variable products with variations). |

## Inventory & Stock Fields

| Field | Format | Purpose |
|-------|--------|---------|
| `stock` | Integer | Current stock quantity available. |
| `in_stock` | String (`1` or `0`) | Stock availability flag. `1` = in stock, `0` = out of stock. |
| `low_stock_amount` | Integer | Threshold for low stock warnings. Alert triggered when stock falls below this value. |

## Physical Attributes

| Field | Format | Purpose |
|-------|--------|---------|
| `weight_lbs` | Decimal number | Product weight in pounds. Used for shipping calculations. |
| `length_in` | Decimal number | Product length in inches. |
| `width_in` | Decimal number | Product width in inches. |
| `height_in` | Decimal number | Product height in inches. |

## Taxonomy & Classification

| Field | Format | Purpose |
|-------|--------|---------|
| `categories` | String (single category name) | Product category. Only one category per product. Stored as single-item array in database. |
| `tags` | String (pipe-delimited: `tag1\|tag2\|tag3`) | Product tags for filtering/search. Multiple tags separated by pipe (`\|`). |
| `brands` | String | Product brand/manufacturer name. |

## SEO & Metadata

| Field | Format | Purpose |
|-------|--------|---------|
| `seo_title` | String | Custom SEO page title. If empty, uses product name. |
| `seo_description` | String | Meta description for search engines. |
| `meta_data` | JSON string | Additional metadata stored as JSON object. Flexible field for custom data. |

## Product Identification

| Field | Format | Purpose |
|-------|--------|---------|
| `gtin_upc_ean_isbn` | String | Global Trade Item Number (UPC, EAN, ISBN, etc.). Used for product identification in marketplaces. |
| `published` | String | Publication status/date. |

## Visibility & Status

| Field | Format | Purpose |
|-------|--------|---------|
| `visibility_in_catalog` | String | Controls where product appears (catalog, search, etc.). |
| `tax_status` | String | Tax status (taxable, shipping-only, none). |
| `tax_class` | String | Tax class/category for tax calculations. |
| `shipping_class` | String | Shipping class for shipping cost calculations. |
| `backorders_allowed` | String | Whether backorders are allowed when out of stock. |
| `sold_individually` | String | Whether product can only be purchased one at a time. |
| `allow_customer_reviews` | String | Whether customers can leave reviews. |
| `purchase_note` | String | Custom message shown to customers after purchase. |

## Regional Fields

| Field | Format | Purpose |
|-------|--------|---------|
| `region` | String (`us` or `eu`) | Product region. Determines currency and regional availability. Defaults to `us` if not specified. |
| `product_group_id` | UUID string | Links US and EU versions of the same product. Products with same `product_group_id` are grouped together. Leave empty/null for single-region products. |

## Legacy Fields (Deprecated)

| Field | Format | Purpose |
|-------|--------|---------|
| `images` | String | **Legacy field.** Use `product_images` instead. |
| `is_featured` | String | **Legacy field.** Use `featured` instead. |
| `date_sale_price_starts` | String | **Legacy field.** Use `sale_start_date` instead. |
| `date_sale_price_ends` | String | **Legacy field.** Use `sale_end_date` instead. |

## JSON Fields (Complex Data Structures)

These fields contain JSON arrays as strings. Each represents a collection of related data.

### `product_images`

**Format:** JSON array string

**Structure:**
```json
[
  {
    "image_url": "https://example.com/image.jpg",
    "alt_text": "Product image description",
    "is_primary": true,
    "sort_order": 0
  }
]
```

**Fields:**
- `image_url` (required): URL to the product image
- `alt_text` (optional): Alt text for accessibility
- `is_primary` (optional): Whether this is the primary/featured image
- `sort_order` (optional): Display order (lower numbers appear first)

**Purpose:** Product image gallery. Multiple images can be associated with a product.

---

### `product_variations`

**Format:** JSON array string

**Structure:**
```json
[
  {
    "variation_type": "dropdown",
    "name": "Size",
    "description": "Select your size",
    "is_required": true,
    "tracks_stock": false,
    "sort_order": 0,
    "options": [
      {
        "option_name": "Small",
        "option_value": "S",
        "price_adjustment": 0,
        "image_url": "https://example.com/small.jpg",
        "is_default": true,
        "is_available": true,
        "sort_order": 0,
        "stock_quantity": 10,
        "low_stock_threshold": 5,
        "reserved_quantity": 0
      }
    ]
  }
]
```

**Variation Types:** `text`, `dropdown`, `image`, `boolean`, `model` (legacy, maps to `image`), `radio` (legacy, maps to `boolean`), `select` (legacy, maps to `dropdown`)

**Variation Fields:**
- `variation_type` (required): Type of variation input
- `name` (required): Variation name/label
- `description` (optional): Help text for the variation
- `is_required` (optional): Whether selection is mandatory
- `tracks_stock` (optional): Whether stock is tracked per option
- `sort_order` (optional): Display order

**Option Fields:**
- `option_name` (required): Display name of the option
- `option_value` (required): Internal value
- `price_adjustment` (optional): Price change when this option is selected (can be negative)
- `image_url` (optional): Image associated with this option
- `is_default` (optional): Whether this is the default selection
- `is_available` (optional): Whether option is currently available
- `sort_order` (optional): Display order within variation
- `stock_quantity` (optional): Stock level for this option (if `tracks_stock` is true)
- `low_stock_threshold` (optional): Low stock warning threshold
- `reserved_quantity` (optional): Reserved stock quantity

**Purpose:** Product variations/options (size, color, material, etc.). Allows customers to customize products.

---

### `product_bundle_items`

**Format:** JSON array string

**Structure:**
```json
[
  {
    "item_sku": "ITEM-SKU-123",
    "quantity": 2,
    "item_type": "required",
    "is_configurable": false,
    "price_adjustment": 0,
    "display_name": "Custom Name",
    "description": "Item description",
    "sort_order": 0
  }
]
```

**Fields:**
- `item_sku` (required): SKU of the bundled product (must exist in same region)
- `quantity` (optional): Quantity of this item in the bundle (default: 1)
- `item_type` (required): `required` or `optional`
- `is_configurable` (optional): Whether customer can change quantity
- `price_adjustment` (optional): Price change for this bundle item (can be negative)
- `display_name` (optional): Custom name shown in bundle (overrides product name)
- `description` (optional): Custom description for bundle item
- `sort_order` (optional): Display order in bundle

**Purpose:** Defines items included in a bundle product. Only used when `is_bundle` is `true`.

---

### `product_faqs`

**Format:** JSON array string

**Structure:**
```json
[
  {
    "question": "What is the warranty?",
    "answer": "1 year manufacturer warranty",
    "sort_order": 0
  }
]
```

**Fields:**
- `question` (required): FAQ question text
- `answer` (required): FAQ answer text
- `sort_order` (optional): Display order

**Purpose:** Frequently asked questions specific to the product.

---

### `assembly_manuals`

**Format:** JSON array string

**Structure:**
```json
[
  {
    "name": "Assembly Instructions",
    "description": "Step-by-step guide",
    "file_url": "https://example.com/manual.pdf",
    "file_type": "pdf",
    "file_size": 1024000,
    "image_url": "https://example.com/thumbnail.jpg",
    "sort_order": 0
  }
]
```

**Fields:**
- `name` (required): Manual/document name
- `description` (optional): Description of the manual
- `file_url` (required): URL to the manual file
- `file_type` (optional): `pdf`, `doc`, `docx`, `txt`, or `zip`
- `file_size` (optional): File size in bytes
- `image_url` (optional): Thumbnail/preview image
- `sort_order` (optional): Display order

**Purpose:** Assembly instructions, manuals, or downloadable documents for the product.

---

### `product_additional_info`

**Format:** JSON array string

**Structure:**
```json
[
  {
    "title": "Specifications",
    "description": "Technical details",
    "content_type": "text",
    "content_data": {
      "key1": "value1",
      "key2": "value2"
    },
    "sort_order": 0
  }
]
```

**Fields:**
- `title` (required): Section title
- `description` (optional): Section description
- `content_type` (optional): `text`, `images`, `mixed`, or `html`
- `content_data` (optional): Additional structured data as JSON object
- `sort_order` (optional): Display order

**Purpose:** Additional product information sections (specifications, features, etc.).

---

## Import Modes

When importing, you can specify a mode:

- **`create`**: Create new products. Skip duplicates silently (no error).
- **`update`**: Update existing products (matched by SKU + region). Create new if not found.
- **`skip_duplicates`**: Skip products that already exist (matched by SKU + region).

## Notes

1. **Region Awareness**: Products are identified by SKU + region combination. Same SKU can exist in both US and EU regions.

2. **Product Groups**: Products with the same `product_group_id` are linked as US/EU versions of the same product. Some fields sync between grouped products.

3. **JSON Fields**: All JSON fields must be valid JSON arrays. Invalid JSON will cause import errors.

4. **Date Formats**: Dates should be in ISO 8601 format (e.g., `2024-01-15T00:00:00.000Z`).

5. **Boolean Values**: Use `true`/`false` (lowercase) for boolean fields, or `1`/`0` for `in_stock`.

6. **CSV Escaping**: Fields containing commas, quotes, or newlines are automatically escaped with double quotes in exports.

7. **Validation**: The system validates all rows before import. Use the validate endpoint to check CSV without importing.


