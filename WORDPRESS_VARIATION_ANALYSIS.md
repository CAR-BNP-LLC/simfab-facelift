# WordPress Variation Structure Analysis

## Key Discovery: WordPress Uses Separate Products for Variations

In WordPress/WooCommerce, **variations are NOT stored as part of the parent product**. Instead:

1. **Variable Product** (`Type=variable`): The parent product that defines attributes
2. **Variation Products** (`Type=variation`): Separate product entries, each representing one combination of attribute values

## Structure

### Variable Product (Parent)
- **Type**: `variable`
- **Has Attributes**: Defines `Attribute 1 name`, `Attribute 1 value(s)`, etc.
- **No Variations**: The variable product itself doesn't have variations attached
- **Example**:
  ```
  ID: 2971
  SKU: sim-racing-dd
  Type: variable
  Attribute 1 name: Choose Seat Color (Removable Foam)
  Attribute 1 value(s): Black, Blue, Gray, Green, Olive Green, Orange, Red, Yellow
  Attribute 2 name: Choose pedal plate
  Attribute 2 value(s): OpenWheeler GEN3 Racing Cockpit with default pedal plate, OpenWheeler GEN3 Racing Cockpit with flat pedal plate
  ```

### Variation Products (Children)
- **Type**: `variation`
- **Parent**: Contains the **SKU** (not ID!) of the variable product
- **Individual Products**: Each variation is a separate product with its own:
  - SKU (may be empty)
  - Price (can differ per variation)
  - Stock (tracked per variation)
  - Sale price (can differ per variation)
- **Attribute Values**: Stored in `Attribute X default` fields (though these appear empty in the export - values may be inferred from SKU/name)
- **Example**:
  ```
  ID: 2975
  SKU: dd-black
  Type: variation
  Parent: sim-racing-dd  (SKU of parent, not ID!)
  Regular price: 699
  Sale price: 649
  Stock: 98
  Attribute 1 default: (empty in export, but represents "Black")
  Attribute 2 default: (empty in export)
  ```

## Important Findings

1. **Parent Reference**: WordPress uses **SKU** (not ID) to link variations to parent
   - Variable product SKU: `sim-racing-dd`
   - Variation products have `Parent: sim-racing-dd`

2. **Attribute Values**: The `Attribute X default` fields in variations appear empty in the CSV export
   - Values may be stored differently in WordPress database
   - SKU often contains the attribute value (e.g., `dd-black` = "Black" color)
   - Need to infer attribute values from SKU pattern or name

3. **Stock Tracking**: Each variation has its own stock level
   - Variable product doesn't have stock
   - Stock is tracked at variation level

4. **Pricing**: Each variation can have different prices
   - Regular price can differ per variation
   - Sale price can differ per variation

## Mapping to Our System

### Our System Structure
- **Single Product**: One product entry
- **Variations as JSON**: Variations stored in `product_variations` JSON array
- **Options within Variations**: Each variation has an array of options
- **Stock Tracking**: Can track stock per variation option (if `tracks_stock: true`)

### Transformation Required

**Step 1: Identify Variable Products**
- Find all rows where `Type == 'variable'`
- These become our products
- Extract attributes from `Attribute X name` and `Attribute X value(s)` fields

**Step 2: Group Variations**
- Find all rows where `Type == 'variation'` and `Parent == <variable_product_sku>`
- Group variations by their parent SKU

**Step 3: Build Variation Structure**
For each variable product:
1. Create one product entry
2. Build `product_variations` JSON array:
   - Each `Attribute X` from variable product becomes a variation
   - Each value in `Attribute X value(s)` becomes an option
   - Map variation prices/stock from variation products

**Step 4: Map Variation Data**
- **Variation Type**: Default to `dropdown` (or infer from attribute name)
- **Option Names**: From `Attribute X value(s)` (comma-separated)
- **Option Prices**: Need to check if variations have different prices
- **Option Stock**: From variation product's `Stock` field
- **Default Option**: From `Attribute X default` (if available) or first option

## Challenges

1. **Attribute Values Not in CSV**: The `Attribute X default` fields are empty in variations
   - May need to infer from SKU pattern (e.g., `dd-black` → "Black")
   - Or parse from variation name
   - Or check WordPress database directly

2. **Price Differences**: Variations can have different prices
   - Need to map price differences to `price_adjustment` in options
   - Or set `price_min`/`price_max` on product

3. **Stock Per Variation**: WordPress tracks stock per variation
   - Our system can track stock per option if `tracks_stock: true`
   - Need to map variation stock to option stock

4. **Multiple Attributes**: Products can have 2-3 attributes
   - Each attribute becomes a separate variation in our system
   - Need to handle combinations correctly

## Example Transformation

### WordPress Structure:
```
Variable Product:
  SKU: sim-racing-dd
  Attribute 1: Color = Black, Blue, Red
  Attribute 2: Size = Small, Large

Variation Products:
  Variation 1: SKU=dd-black-small, Parent=sim-racing-dd, Price=699, Stock=10
  Variation 2: SKU=dd-black-large, Parent=sim-racing-dd, Price=749, Stock=5
  Variation 3: SKU=dd-blue-small, Parent=sim-racing-dd, Price=699, Stock=8
  Variation 4: SKU=dd-blue-large, Parent=sim-racing-dd, Price=749, Stock=12
  ...
```

### Our System Structure:
```json
{
  "sku": "sim-racing-dd",
  "product_variations": [
    {
      "variation_type": "dropdown",
      "name": "Color",
      "is_required": true,
      "tracks_stock": true,
      "options": [
        {
          "option_name": "Black",
          "option_value": "Black",
          "price_adjustment": 0,
          "stock_quantity": 15,  // Sum of black-small + black-large
          "is_default": true
        },
        {
          "option_name": "Blue",
          "option_value": "Blue",
          "price_adjustment": 0,
          "stock_quantity": 20  // Sum of blue-small + blue-large
        },
        {
          "option_name": "Red",
          "option_value": "Red",
          "price_adjustment": 0,
          "stock_quantity": 0
        }
      ]
    },
    {
      "variation_type": "dropdown",
      "name": "Size",
      "is_required": true,
      "tracks_stock": true,
      "options": [
        {
          "option_name": "Small",
          "option_value": "Small",
          "price_adjustment": 0,
          "stock_quantity": 18,  // Sum of all small variations
          "is_default": true
        },
        {
          "option_name": "Large",
          "option_value": "Large",
          "price_adjustment": 50,  // Price difference
          "stock_quantity": 17  // Sum of all large variations
        }
      ]
    }
  ]
}
```

## Questions to Resolve

1. **How to handle price differences?**
   - Option A: Use `price_adjustment` on options
   - Option B: Set `price_min`/`price_max` on product
   - Option C: Use base price + adjustments

2. **How to map stock?**
   - WordPress: Stock per variation combination (e.g., "Black + Small" = 10)
   - Our system: Stock per option (e.g., "Black" = 15, "Small" = 18)
   - **Problem**: Can't represent combination stock in our system
   - **Solution**: Track stock at option level, or don't track stock per option

3. **How to infer attribute values from variations?**
   - Parse SKU pattern?
   - Parse variation name?
   - Check WordPress database?
   - Use a mapping table?

4. **What if variations have different base prices?**
   - Set `regular_price` to minimum variation price?
   - Use `price_min`/`price_max`?
   - Calculate average?

## Recommended Approach

1. **Import variable products** as our products
2. **Extract attributes** from variable product's `Attribute X` fields
3. **Create variations** for each attribute
4. **Create options** from attribute values
5. **Map stock**: If WordPress tracks stock per combination, we may need to:
   - Not track stock per option (`tracks_stock: false`)
   - Or aggregate stock somehow
6. **Map prices**: Use `price_min`/`price_max` if variations have different prices
7. **Skip variation products**: Don't import them as separate products, they're just data sources

## Next Steps

1. **Verify attribute values**: Check if `Attribute X default` is populated in WordPress database
2. **Test with one product**: Transform one variable product + its variations
3. **Handle edge cases**: Products with 1 attribute, products with 3 attributes, etc.
4. **Price strategy**: Decide how to handle price differences
5. **Stock strategy**: Decide how to handle stock tracking


