# Missing Fields: WordPress Fields Not in Our System

This document lists WordPress/WooCommerce CSV fields that don't have direct equivalents in our system.

## WordPress-Specific Fields (Can Be Ignored)

These fields are WordPress/WooCommerce-specific and don't apply to our system:

| WordPress Field | Purpose | Why We Don't Have It |
|----------------|---------|---------------------|
| `ID` | WordPress internal product ID | We use SKU+region as identifier, not internal IDs |
| `Parent` | Parent product ID for variable products | We don't have parent-child product relationships. Variations are directly on products. |
| `Upsells` | Related products to upsell | We don't have upsell functionality |
| `Cross-sells` | Related products for cross-selling | We don't have cross-sell functionality |
| `External URL` | URL for external/affiliate products | We don't support external/affiliate products |
| `Button text` | Button text for external products | We don't support external products |
| `Position` | Menu order/position | We don't use position ordering for products (only for variations/images within products) |
| `Download limit` | Download limit for downloadable products | We don't support downloadable/virtual products |
| `Download expiry days` | Download expiry for downloadable products | We don't support downloadable products |
| `Attribute X global` | Whether attribute is global (shared across products) | We don't have global/shared variations. Each product has its own variations. |

## Fields That May Need Custom Handling

These fields exist in WordPress but may need special transformation or may be partially supported:

| WordPress Field | Purpose | Our Equivalent | Notes |
|----------------|---------|----------------|-------|
| `Grouped products` | WooCommerce grouped products (products sold together) | Conceptually similar to `product_bundle_items` | **NEEDS DISCUSSION:** Are grouped products the same as bundles? May need transformation logic. |
| `Attribute X visible` | Whether attribute variation is visible | N/A | We don't have visibility flag. All variations are visible if they exist. **QUESTION:** Should we skip creating variations if not visible? |
| `Type` | Product type (simple, variable, grouped, external) | `type` | **NEEDS MAPPING:** WordPress types may differ from ours. Need mapping table. |

## WordPress Meta Fields (Plugin-Specific)

These are WordPress meta fields from various plugins. Most can be ignored, but some may contain useful data:

### Yoast SEO Meta Fields
| WordPress Field | Purpose | Our Equivalent |
|----------------|---------|----------------|
| `Meta: _yoast_wpseo_primary_product_cat` | Primary category for SEO | May map to `categories` |
| `Meta: _yoast_wpseo_primary_fb_product_set` | Facebook product set | N/A |
| `Meta: _yoast_wpseo_content_score` | SEO content score | N/A |
| `Meta: _yoast_wpseo_estimated-reading-time-minutes` | Reading time estimate | N/A |
| `Meta: _yoast_wpseo_wordproof_timestamp` | WordProof timestamp | N/A |
| `Meta: _yoast_wpseo_primary_product_brand` | Primary brand for SEO | May map to `brands` |
| `Meta: _yoast_wpseo_metadesc` | Meta description | Maps to `seo_description` |

### Facebook/Google Shopping Meta Fields
| WordPress Field | Purpose | Our Equivalent |
|----------------|---------|----------------|
| `Meta: _wc_gla_mc_status` | Google Merchant Center status | N/A |
| `Meta: fb_product_group_id` | Facebook product group ID | N/A |
| `Meta: _wc_gla_sync_status` | Google sync status | N/A |
| `Meta: _wc_gla_brand` | Google brand | May map to `brands` |
| `Meta: _wc_gla_visibility` | Google visibility | N/A |
| `Meta: _wc_facebook_commerce_enabled` | Facebook commerce enabled | N/A |
| `Meta: hwp_product_gtin` | Product GTIN | Maps to `gtin_upc_ean_isbn` |
| `Meta: _wc_facebook_enhanced_catalog_attributes_*` | Various Facebook catalog attributes | N/A (Facebook-specific) |
| `Meta: fb_brand` | Facebook brand | May map to `brands` |
| `Meta: fb_mpn` | Manufacturer Part Number | N/A |
| `Meta: fb_size` | Facebook size | N/A |
| `Meta: fb_color` | Facebook color | N/A |
| `Meta: fb_material` | Facebook material | N/A |
| `Meta: fb_pattern` | Facebook pattern | N/A |
| `Meta: fb_age_group` | Facebook age group | N/A |
| `Meta: fb_gender` | Facebook gender | N/A |
| `Meta: fb_product_condition` | Facebook product condition | N/A |
| `Meta: _wc_facebook_sync_enabled` | Facebook sync enabled | N/A |
| `Meta: fb_visibility` | Facebook visibility | N/A |
| `Meta: fb_product_description` | Facebook product description | N/A |
| `Meta: fb_rich_text_description` | Facebook rich text description | N/A |
| `Meta: _wc_facebook_product_image_source` | Facebook image source | N/A |
| `Meta: fb_product_item_id` | Facebook product item ID | N/A |
| `Meta: _wc_gla_condition` | Google condition | N/A |
| `Meta: _wc_gla_color` | Google color | N/A |
| `Meta: fb_product_price` | Facebook product price | N/A |
| `Meta: fb_product_image` | Facebook product image | N/A |

### Theme/Builder Meta Fields
| WordPress Field | Purpose | Our Equivalent |
|----------------|---------|----------------|
| `Meta: _fusion_google_fonts` | Avada theme Google fonts | N/A |
| `Meta: fusion_builder_status` | Avada Fusion Builder status | N/A |
| `Meta: avada_post_views_count` | Avada post views | N/A |
| `Meta: avada_today_post_views_count` | Avada today's views | N/A |
| `Meta: avada_post_views_count_today_date` | Avada views date | N/A |
| `Meta: _fusion_builder_custom_css` | Avada custom CSS | N/A |

### Plugin-Specific Meta Fields
| WordPress Field | Purpose | Our Equivalent |
|----------------|---------|----------------|
| `Meta: cmplz_hide_cookiebanner` | Complianz cookie banner | N/A |
| `Meta: _last_editor_used_jetpack` | Jetpack editor | N/A |
| `Meta: notification_email_list_count` | Email notification count | N/A |
| `Meta: notification_list_sorting` | Email notification sorting | N/A |
| `Meta: tm_meta` | Theme/plugin meta | N/A |
| `Meta: mailsending_op_*` | Various mail sending options | N/A |
| `Meta: rs_page_bg_color` | Page background color | N/A |
| `Meta: _oembed_*` | Various oEmbed fields | N/A |
| `Meta: _wp_old_date` | WordPress old date | N/A |

## Fields We Should Extract (If Available)

These WordPress fields may contain data we want to preserve:

| WordPress Field | Extract To | Reason |
|----------------|-----------|--------|
| `Meta: _yoast_wpseo_metadesc` | `seo_description` | SEO meta description |
| `Meta: _yoast_wpseo_primary_product_cat` | `categories` | Primary category |
| `Meta: _yoast_wpseo_primary_product_brand` | `brands` | Primary brand |
| `Meta: hwp_product_gtin` | `gtin_upc_ean_isbn` | Product GTIN |
| `Meta: _wc_gla_brand` | `brands` | Google brand |
| `Meta: fb_brand` | `brands` | Facebook brand |

**Note:** These should be extracted only if the main field (`seo_description`, `categories`, `brands`, `gtin_upc_ean_isbn`) is empty.

## Summary

**Total WordPress Fields:** ~200+ fields

**Fields We Can Use Directly:** ~30 fields (see mappings document)

**Fields We Can Ignore:** ~170+ fields (WordPress-specific, plugin-specific, or not applicable)

**Fields Needing Discussion:**
1. `Grouped products` - Is this the same as bundles?
2. `Attribute X visible` - Should we skip invisible variations?
3. `Type` - Need mapping from WordPress types to our types
4. Meta fields - Should we extract any meta fields to our `meta_data` JSON?

## Recommendations

1. **Ignore all meta fields** unless they contain critical data (SEO descriptions, GTIN, brands)
2. **Extract meta fields** only if main field is empty (fallback)
3. **Create mapping table** for WordPress product types to our types
4. **Handle grouped products** as bundles if they're conceptually the same
5. **Skip invisible attributes** when creating variations (if `Attribute X visible` is false/0)


