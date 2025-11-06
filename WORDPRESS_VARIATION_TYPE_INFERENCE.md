# Variation Type Inference Strategy

## Supported Variation Types

Our system supports: `text`, `dropdown`, `image`, `boolean`

## Inference Strategy

### 1. Pattern Matching (Fast, Free)

#### Boolean Detection
**Keywords to look for:**
- In attribute name: "yes", "no", "on", "off", "enable", "disable", "include", "exclude", "add", "remove", "optional"
- In option values: If only 2 options and they match Yes/No, On/Off, Include/Exclude patterns

**Examples:**
- "Include warranty" → `boolean`
- "Add protection plan" → `boolean`
- Options: ["Yes", "No"] → `boolean`
- Options: ["Include", "Exclude"] → `boolean`

#### Image Detection
**Keywords to look for:**
- In attribute name: "color", "colour", "material", "finish", "pattern", "style", "design", "appearance", "look"
- Context clues: If attribute name suggests visual selection

**Examples:**
- "Choose Seat Color" → `image`
- "Material Selection" → `image`
- "Finish Type" → `image`
- "Pattern" → `image`
- "Style" → `image`

#### Dropdown Detection (Default)
**Everything else:**
- Size, quantity, configuration options
- Multiple options (>2) that aren't colors/materials
- Default fallback

**Examples:**
- "Choose Size" → `dropdown`
- "Select Quantity" → `dropdown`
- "Choose pedal plate" → `dropdown`
- "Type" → `dropdown`

### 2. AI Inference (For Ambiguous Cases)

**When to use AI:**
- Pattern matching is uncertain
- Attribute name doesn't match clear patterns
- Need context from product name/description

**AI Prompt:**
```
Determine the variation type for this product attribute:

Product: {product_name}
Attribute Name: {attribute_name}
Attribute Values: {values_list}

Variation types:
- "image": For visual selections like colors, materials, finishes where each option typically has an image
- "boolean": For yes/no, on/off, include/exclude type selections (usually 2 options)
- "dropdown": For standard select dropdowns with multiple options

Return ONLY one word: "image", "boolean", or "dropdown"
```

## Implementation Plan

### Step 1: Pattern Matching
```typescript
function inferVariationTypeFromPattern(attrName: string, values: string[]): string | null {
  const nameLower = attrName.toLowerCase();
  
  // Boolean detection
  const booleanKeywords = ['yes', 'no', 'on', 'off', 'enable', 'disable', 'include', 'exclude', 'add', 'remove', 'optional'];
  if (booleanKeywords.some(kw => nameLower.includes(kw))) {
    return 'boolean';
  }
  
  // Check if only 2 options match boolean pattern
  if (values.length === 2) {
    const valuesLower = values.map(v => v.toLowerCase());
    const booleanPairs = [
      ['yes', 'no'], ['on', 'off'], ['include', 'exclude'],
      ['add', 'remove'], ['enable', 'disable'], ['with', 'without']
    ];
    if (booleanPairs.some(pair => 
      (valuesLower.includes(pair[0]) && valuesLower.includes(pair[1]))
    )) {
      return 'boolean';
    }
  }
  
  // Image detection
  const imageKeywords = ['color', 'colour', 'material', 'finish', 'pattern', 'style', 'design', 'appearance', 'look'];
  if (imageKeywords.some(kw => nameLower.includes(kw))) {
    return 'image';
  }
  
  // Default to dropdown
  return null; // Will use AI or default
}
```

### Step 2: AI Inference (Fallback)
```typescript
async function inferVariationTypeWithAI(
  productName: string,
  attrName: string,
  values: string[]
): Promise<string> {
  const prompt = `Determine the variation type for this product attribute:

Product: ${productName}
Attribute Name: ${attrName}
Attribute Values: ${values.join(', ')}

Variation types:
- "image": For visual selections like colors, materials, finishes where each option typically has an image
- "boolean": For yes/no, on/off, include/exclude type selections (usually 2 options)
- "dropdown": For standard select dropdowns with multiple options

Return ONLY one word: "image", "boolean", or "dropdown"`;

  // Call OpenAI
  const response = await this.openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a helpful assistant. Return only one word: image, boolean, or dropdown.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 10,
  });

  const result = response.choices[0]?.message?.content?.trim().toLowerCase();
  if (result === 'image' || result === 'boolean' || result === 'dropdown') {
    return result;
  }
  
  return 'dropdown'; // Fallback
}
```

### Step 3: Combined Logic
```typescript
async function inferVariationType(
  productName: string,
  attrName: string,
  values: string[]
): Promise<string> {
  // Try pattern matching first
  const patternMatch = inferVariationTypeFromPattern(attrName, values);
  if (patternMatch) {
    return patternMatch;
  }
  
  // Use AI for ambiguous cases
  if (this.openai) {
    return await inferVariationTypeWithAI(productName, attrName, values);
  }
  
  // Default fallback
  return 'dropdown';
}
```

## Low Stock Amount Suggestion

### Recommendation: Use Product-Level Value

**For Simple Products:**
- Direct mapping: `low_stock_amount: row['Low stock amount']`

**For Variable Products:**
- Use the variable product's `Low stock amount` field (if set)
- This represents the threshold for the entire product
- Stock is tracked per option, but low stock warning uses product-level threshold
- Alternative: Could calculate as percentage of total stock (e.g., 20% of total)

**Rationale:**
- Simple and consistent
- WordPress likely sets this at product level
- For variable products, it's a warning threshold for the whole product, not per option
- Option-level `low_stock_threshold` is already calculated (20% of option stock)

**Implementation:**
```typescript
low_stock_amount: variableProduct['Low stock amount'] || '',
```

This way:
- Simple products: Use WordPress value directly
- Variable products: Use WordPress value (applies to whole product)
- If not set: Leave empty (can be set manually later)

