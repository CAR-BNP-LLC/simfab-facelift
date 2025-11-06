# WordPress Migration: Price & Stock Handling Strategies

## 1. Price Variation Per Option

### Answer: Yes, Both Systems Support It!

**WordPress:**
- Each variation product has its own price
- Price can differ per combination (e.g., "Black + Small" = $699, "Black + Large" = $749)

**Our System:**
- Each option can have `price_adjustment` (positive or negative)
- Final price = `regular_price` + sum of all selected option `price_adjustment` values
- Example: Base $699, "Large" option has `price_adjustment: 50` → Large costs $749

### Strategy: Calculate Price Adjustments

**When WordPress variations have different prices:**

1. **Find base price**: Use minimum variation price as `regular_price`
2. **Calculate adjustments**: For each option, calculate average price difference
3. **Map to options**: Set `price_adjustment` on options

**Example:**
```
WordPress Variations:
  Black + Small = $699
  Black + Large = $749
  Blue + Small = $699
  Blue + Large = $749

Our System:
  regular_price: 699 (minimum)
  
  Color variation:
    Black: price_adjustment: 0
    Blue: price_adjustment: 0
  
  Size variation:
    Small: price_adjustment: 0
    Large: price_adjustment: 50  (749 - 699)
```

**Algorithm:**
```python
# Pseudo-code
base_price = min(all_variation_prices)

for each_attribute:
    for each_option_value:
        # Find all variations with this option
        variations_with_option = filter variations where option_value matches
        
        # Calculate average price for this option
        avg_price = average(variations_with_option.prices)
        
        # Set adjustment
        option.price_adjustment = avg_price - base_price
```

**Edge Cases:**
- If all variations have same price → all `price_adjustment: 0`
- If price varies by combination → calculate per option (may lose some granularity)
- If price varies randomly → use average or most common price

---

## 2. Stock Tracking Ideas

### Problem
- **WordPress**: Tracks stock per combination (e.g., "Black + Small" = 10 units)
- **Our System**: Tracks stock per option (e.g., "Black" = 15 units, "Small" = 18 units)

### Solution Options

#### Option A: Don't Track Stock Per Option (Recommended)
**Set `tracks_stock: false` on all variations**

**Pros:**
- Simple, no data loss
- Stock tracked at product level only
- No combination conflicts

**Cons:**
- Lose granular stock tracking
- Can't show "Only 2 left in Black"

**Implementation:**
```json
{
  "variation_type": "dropdown",
  "name": "Color",
  "tracks_stock": false,  // ← Set to false
  "options": [
    {"option_name": "Black", "stock_quantity": null},
    {"option_name": "Blue", "stock_quantity": null}
  ]
}
```

#### Option B: Aggregate Stock Per Option
**Sum stock across all combinations containing that option**

**Pros:**
- Maintains stock tracking capability
- Shows availability per option

**Cons:**
- Can be misleading (e.g., "Black" shows 15, but "Black + Small" only has 5)
- May show "in stock" when specific combination is out

**Algorithm:**
```python
for each_option_value:
    # Find all variations containing this option
    variations_with_option = filter variations where option_value matches
    
    # Sum stock
    total_stock = sum(v.stock for v in variations_with_option)
    
    option.stock_quantity = total_stock
```

**Example:**
```
WordPress:
  Black + Small = 5 units
  Black + Large = 10 units
  Blue + Small = 8 units
  Blue + Large = 12 units

Our System:
  Black: stock_quantity = 5 + 10 = 15
  Blue: stock_quantity = 8 + 12 = 20
  Small: stock_quantity = 5 + 8 = 13
  Large: stock_quantity = 10 + 12 = 22
```

#### Option C: Use Minimum Stock Per Option
**Use minimum stock across combinations**

**Pros:**
- Conservative approach
- Won't oversell

**Cons:**
- Very conservative (may show "out of stock" when some combinations available)
- Doesn't reflect true availability

**Algorithm:**
```python
for each_option_value:
    variations_with_option = filter variations where option_value matches
    min_stock = min(v.stock for v in variations_with_option)
    option.stock_quantity = min_stock
```

#### Option D: Track Stock at Product Level Only
**Set product-level stock, ignore option-level**

**Pros:**
- Simplest approach
- No conflicts

**Cons:**
- Lose all granularity
- Can't track which combinations are available

**Implementation:**
```json
{
  "sku": "product-123",
  "stock": 35,  // Sum of all variation stocks
  "product_variations": [
    {
      "tracks_stock": false,
      "options": []  // No stock tracking
    }
  ]
}
```

#### Option E: Hybrid Approach (Advanced)
**Track stock per option, but validate combinations**

**Pros:**
- Most accurate
- Best user experience

**Cons:**
- Complex to implement
- Requires custom validation logic

**Implementation:**
- Track stock per option (aggregated)
- When checking availability, validate combination exists
- May need to maintain a mapping of valid combinations

### Recommendation

**Use Option A (Don't Track Stock Per Option)** for initial migration:
- Simplest and safest
- No data conflicts
- Can add granular tracking later if needed

**Or Option B (Aggregate Stock)** if you need stock tracking:
- More accurate than product-level only
- Still has limitations but manageable

---

## 3. Parsing Attribute Values from Variations

### Challenge
WordPress `Attribute X default` fields are empty in CSV export. Need to infer which attribute values each variation represents.

### Parsing Strategies

#### Strategy A: Parse from SKU Pattern
**Look for patterns in variation SKU**

**Examples:**
- `dd-black` → Color: "Black"
- `dd-black-small` → Color: "Black", Size: "Small"
- `product-red-large` → Color: "Red", Size: "Large"

**Algorithm:**
```python
def parse_sku_for_attributes(sku, attribute_values):
    """
    Try to match SKU parts to attribute values
    """
    sku_lower = sku.lower()
    matched_values = []
    
    for attr_value in attribute_values:
        # Try exact match
        if attr_value.lower() in sku_lower:
            matched_values.append(attr_value)
        # Try partial match (e.g., "black" matches "black-leather")
        elif any(word in sku_lower for word in attr_value.lower().split()):
            matched_values.append(attr_value)
    
    return matched_values
```

**Pros:**
- Fast, no AI needed
- Works if SKUs follow patterns

**Cons:**
- May fail if SKUs don't follow patterns
- Ambiguous matches possible

#### Strategy B: Parse from Variation Name
**Extract attribute values from variation product name**

**Examples:**
- Name: "Product Name - Black - Small" → Color: "Black", Size: "Small"
- Name: "Product Name (Blue, Large)" → Color: "Blue", Size: "Large"

**Algorithm:**
```python
def parse_name_for_attributes(name, parent_name, attribute_values):
    """
    Remove parent name, extract remaining parts
    """
    # Remove parent name
    remaining = name.replace(parent_name, '').strip()
    
    # Try to match attribute values
    matched = []
    for attr_value in attribute_values:
        if attr_value.lower() in remaining.lower():
            matched.append(attr_value)
    
    return matched
```

**Pros:**
- Often more descriptive than SKU
- May contain all attribute values

**Cons:**
- Names may not be structured
- Harder to parse reliably

#### Strategy C: Use AI to Infer Values
**Use LLM to deduce attribute values from context**

**Prompt Example:**
```
Given:
- Parent product: "SimFab DD Modular Racing Sim Cockpit"
- Variation SKU: "dd-black"
- Variation Name: "SimFab DD Modular Racing Sim Cockpit"
- Available Colors: ["Black", "Blue", "Gray", "Green", "Olive Green", "Orange", "Red", "Yellow"]
- Available Sizes: ["Small", "Large"]

Determine which attribute values this variation represents.
```

**Implementation:**
```python
def infer_attributes_with_ai(variation, parent_product, attributes):
    prompt = f"""
    Parent Product: {parent_product['Name']}
    Variation SKU: {variation['SKU']}
    Variation Name: {variation['Name']}
    
    Available Attributes:
    {format_attributes(attributes)}
    
    Determine which attribute values this variation represents.
    Return as JSON: {{"attribute1": "value", "attribute2": "value"}}
    """
    
    response = call_llm(prompt)
    return parse_json(response)
```

**Pros:**
- Most flexible
- Can handle complex cases
- Can use context clues

**Cons:**
- Slower (API calls)
- May cost money
- Requires API key

#### Strategy D: Combination Matrix Approach
**Generate all combinations, match to variations**

**Algorithm:**
```python
def match_variations_to_combinations(variations, attributes):
    """
    1. Generate all possible combinations
    2. Try to match each variation to a combination
    """
    # Generate all combinations
    combinations = generate_combinations(attributes)
    
    # Match variations to combinations
    for variation in variations:
        best_match = find_best_match(variation, combinations)
        variation.attributes = best_match
```

**Pros:**
- Systematic approach
- Can validate completeness

**Cons:**
- Requires all combinations to exist
- May have ambiguous matches

#### Strategy E: Hybrid Approach (Recommended)
**Try multiple methods in order**

**Algorithm:**
```python
def infer_variation_attributes(variation, parent_product, attributes):
    # Try 1: Parse from SKU
    result = parse_sku(variation['SKU'], attributes)
    if result and is_confident(result):
        return result
    
    # Try 2: Parse from Name
    result = parse_name(variation['Name'], parent_product['Name'], attributes)
    if result and is_confident(result):
        return result
    
    # Try 3: Use AI
    result = infer_with_ai(variation, parent_product, attributes)
    return result
```

**Pros:**
- Best of all worlds
- Falls back gracefully
- High accuracy

**Cons:**
- More complex
- May be slower

### Recommended Approach

**Use Strategy E (Hybrid)** with this order:

1. **First**: Try SKU parsing (fast, free)
2. **Second**: Try name parsing (fast, free)
3. **Last**: Use AI for ambiguous cases (slower, but accurate)

**Implementation Plan:**
```python
def infer_variation_attributes(variation, parent_product, attributes):
    """
    Infer which attribute values a variation represents
    """
    # Method 1: SKU pattern matching
    sku_matches = parse_sku_pattern(variation['SKU'], attributes)
    if len(sku_matches) == len(attributes):  # Found all attributes
        return sku_matches
    
    # Method 2: Name parsing
    name_matches = parse_name_pattern(
        variation['Name'], 
        parent_product['Name'], 
        attributes
    )
    if len(name_matches) == len(attributes):
        return name_matches
    
    # Method 3: AI inference (for remaining cases)
    ai_matches = infer_with_ai(variation, parent_product, attributes)
    return ai_matches
```

### AI Prompt Template

```python
AI_PROMPT_TEMPLATE = """
You are analyzing a WordPress product variation to determine which attribute values it represents.

Parent Product:
- Name: {parent_name}
- SKU: {parent_sku}
- Attributes:
{attributes_list}

Variation:
- SKU: {variation_sku}
- Name: {variation_name}
- Price: {variation_price}
- Stock: {variation_stock}

Determine which attribute values this variation represents.
Return ONLY valid JSON in this format:
{{
  "attribute1": "value1",
  "attribute2": "value2",
  "attribute3": "value3"  // if exists
}}

If you cannot determine a value, use null.
"""
```

---

## Summary & Recommendations

### Price Handling
✅ **Use `price_adjustment` per option**
- Calculate base price (minimum variation price)
- Calculate adjustments per option
- Map to our `price_adjustment` field

### Stock Handling
✅ **Option A: Don't track stock per option** (simplest)
- Set `tracks_stock: false`
- Track stock at product level only
- Or **Option B: Aggregate stock** if needed

### Attribute Value Parsing
✅ **Hybrid approach:**
1. Try SKU parsing first (fast)
2. Try name parsing second (fast)
3. Use AI for remaining cases (accurate)

### Next Steps
1. Implement SKU/name parsing functions
2. Set up AI inference for ambiguous cases
3. Test with sample products
4. Refine based on results

