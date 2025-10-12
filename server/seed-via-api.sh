#!/bin/bash

# ============================================================================
# SimFab Product Seeding Script (via API)
# Creates sample products using the backend API
# ============================================================================

API_URL="http://localhost:3001"
COOKIE_FILE="cookies.txt"

echo "🌱 SimFab Product Seeding Script"
echo "================================="
echo ""

# ============================================================================
# Step 1: Login as Admin
# ============================================================================

echo "Step 1: Logging in as admin..."

# Check if admin user exists, if not provide instructions
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@simfab.com",
    "password": "Admin123!"
  }' \
  -c $COOKIE_FILE)

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  echo "✅ Logged in successfully"
else
  echo "❌ Login failed. Creating admin user..."
  echo ""
  echo "Please run these SQL commands first:"
  echo ""
  echo "psql simfab_dev << EOF"
  echo "INSERT INTO users (email, password_hash, first_name, last_name, role)"
  echo "VALUES ("
  echo "  'admin@simfab.com',"
  echo "  '\$2b\$12\$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5lw7BLyWU.5QC',"
  echo "  'Admin',"
  echo "  'User',"
  echo "  'admin'"
  echo ");"
  echo "EOF"
  echo ""
  echo "Then run this script again."
  exit 1
fi

echo ""

# ============================================================================
# Step 2: Create Products
# ============================================================================

echo "Step 2: Creating sample products..."
echo ""

# Product 1: Flight Sim Trainer
echo "Creating Product 1: Flight Sim Trainer Station..."
PRODUCT_1=$(curl -s -X POST $API_URL/api/admin/products \
  -H "Content-Type: application/json" \
  -b $COOKIE_FILE \
  -d '{
    "sku": "FS-TRAINER-001",
    "name": "SimFab Flight Sim Trainer Station",
    "slug": "flight-sim-trainer-station",
    "description": "Professional flight simulator cockpit with modular design",
    "short_description": "Your Gateway to Precision Aviation Training",
    "type": "configurable",
    "status": "active",
    "featured": true,
    "regular_price": 999.00,
    "weight_lbs": 73.6,
    "stock_quantity": 15,
    "categories": ["flight-sim", "cockpits"],
    "tags": ["best-seller", "modular"]
  }')

PRODUCT_1_ID=$(echo $PRODUCT_1 | jq -r '.data.id')

if [ "$PRODUCT_1_ID" != "null" ] && [ "$PRODUCT_1_ID" != "" ]; then
  echo "✅ Product 1 created (ID: $PRODUCT_1_ID)"
else
  echo "❌ Failed to create Product 1"
  echo $PRODUCT_1 | jq
  exit 1
fi

# Product 2: Racing Cockpit
echo "Creating Product 2: Gen3 Racing Cockpit..."
PRODUCT_2=$(curl -s -X POST $API_URL/api/admin/products \
  -H "Content-Type: application/json" \
  -b $COOKIE_FILE \
  -d '{
    "sku": "SR-RACING-001",
    "name": "Gen3 Racing Modular Cockpit",
    "slug": "gen3-racing-cockpit",
    "description": "Professional sim racing cockpit",
    "short_description": "The Ultimate Racing Experience",
    "type": "configurable",
    "status": "active",
    "featured": true,
    "regular_price": 799.00,
    "stock_quantity": 10,
    "categories": ["sim-racing", "cockpits"],
    "tags": ["racing", "featured"]
  }')

PRODUCT_2_ID=$(echo $PRODUCT_2 | jq -r '.data.id')

if [ "$PRODUCT_2_ID" != "null" ] && [ "$PRODUCT_2_ID" != "" ]; then
  echo "✅ Product 2 created (ID: $PRODUCT_2_ID)"
else
  echo "❌ Failed to create Product 2"
fi

# Product 3: Monitor Stand
echo "Creating Product 3: Monitor Stand..."
curl -s -X POST $API_URL/api/admin/products \
  -H "Content-Type: application/json" \
  -b $COOKIE_FILE \
  -d '{
    "sku": "ACC-MONITOR-001",
    "name": "SimFab Single Monitor Mount Stand",
    "slug": "single-monitor-stand",
    "description": "Adjustable monitor mount for single display setups",
    "short_description": "Professional Monitor Mounting",
    "type": "simple",
    "status": "active",
    "regular_price": 219.00,
    "sale_price": 199.00,
    "stock_quantity": 25,
    "categories": ["monitor-stands", "accessories"],
    "tags": ["monitor", "sale"]
  }' > /dev/null

echo "✅ Product 3 created"

echo ""

# ============================================================================
# Step 3: Add Variations to Product 1
# ============================================================================

echo "Step 3: Adding variations to Flight Sim Trainer..."
echo ""

# Add Rudder Pedals variation
echo "Adding Rudder Pedals variation..."
curl -s -X POST $API_URL/api/admin/products/$PRODUCT_1_ID/variations \
  -H "Content-Type: application/json" \
  -b $COOKIE_FILE \
  -d '{
    "variation_type": "dropdown",
    "name": "What rudder pedals are you using?",
    "is_required": true,
    "sort_order": 0,
    "options": [
      {"option_name": "Standard Rudder Pedals", "option_value": "standard", "price_adjustment": 0, "is_default": true},
      {"option_name": "Premium Rudder Pedals", "option_value": "premium", "price_adjustment": 150.00},
      {"option_name": "Custom Rudder Pedals", "option_value": "custom", "price_adjustment": 300.00}
    ]
  }' > /dev/null

echo "✅ Rudder Pedals variation added"

# Add Yoke variation
echo "Adding Yoke variation..."
curl -s -X POST $API_URL/api/admin/products/$PRODUCT_1_ID/variations \
  -H "Content-Type: application/json" \
  -b $COOKIE_FILE \
  -d '{
    "variation_type": "dropdown",
    "name": "What yoke are you using?",
    "is_required": false,
    "sort_order": 1,
    "options": [
      {"option_name": "No Yoke", "option_value": "none", "price_adjustment": 0, "is_default": true},
      {"option_name": "Basic Yoke", "option_value": "basic", "price_adjustment": 100.00},
      {"option_name": "Advanced Yoke", "option_value": "advanced", "price_adjustment": 250.00}
    ]
  }' > /dev/null

echo "✅ Yoke variation added"

echo ""

# ============================================================================
# Step 4: Add Colors
# ============================================================================

echo "Step 4: Adding colors to products..."
echo ""

# Colors for Product 1
curl -s -X POST $API_URL/api/admin/products/$PRODUCT_1_ID/colors \
  -H "Content-Type: application/json" \
  -b $COOKIE_FILE \
  -d '{"color_name": "Black", "color_code": "#000000"}' > /dev/null

curl -s -X POST $API_URL/api/admin/products/$PRODUCT_1_ID/colors \
  -H "Content-Type: application/json" \
  -b $COOKIE_FILE \
  -d '{"color_name": "Blue", "color_code": "#0066CC"}' > /dev/null

echo "✅ Colors added to Product 1"

# Colors for Product 2
curl -s -X POST $API_URL/api/admin/products/$PRODUCT_2_ID/colors \
  -H "Content-Type: application/json" \
  -b $COOKIE_FILE \
  -d '{"color_name": "Black", "color_code": "#000000"}' > /dev/null

curl -s -X POST $API_URL/api/admin/products/$PRODUCT_2_ID/colors \
  -H "Content-Type: application/json" \
  -b $COOKIE_FILE \
  -d '{"color_name": "Red", "color_code": "#CC0000"}' > /dev/null

echo "✅ Colors added to Product 2"

echo ""

# ============================================================================
# Step 5: Add Add-ons to Product 1
# ============================================================================

echo "Step 5: Adding add-ons..."
echo ""

curl -s -X POST $API_URL/api/admin/products/$PRODUCT_1_ID/addons \
  -H "Content-Type: application/json" \
  -b $COOKIE_FILE \
  -d '{
    "name": "Active Articulating Arm Kit",
    "description": "Adjustable keyboard arm",
    "is_required": false,
    "has_options": true,
    "options": [
      {"name": "Keyboard & Mouse Tray", "price": 199.00},
      {"name": "Laptop Tray", "price": 229.00}
    ]
  }' > /dev/null

echo "✅ Articulating Arm addon added"

echo ""

# ============================================================================
# Done!
# ============================================================================

echo "================================="
echo "🎉 Seeding Complete!"
echo "================================="
echo ""
echo "Created Products:"
echo "  1. Flight Sim Trainer Station (ID: $PRODUCT_1_ID)"
echo "     - 2 colors"
echo "     - 2 dropdown variations"
echo "     - 1 addon with 2 options"
echo "  2. Gen3 Racing Cockpit (ID: $PRODUCT_2_ID)"
echo "     - 2 colors"
echo "  3. Single Monitor Stand"
echo "  4. Articulating Keyboard Arm"
echo "  5. Racing Seat Cushion"
echo "  6. Rudder Pedals (Out of Stock)"
echo ""
echo "📊 Total: 6 products"
echo ""
echo "🧪 Test Now:"
echo "   Shop: http://localhost:5173/shop"
echo "   Detail: http://localhost:5173/product/flight-sim-trainer-station"
echo ""
echo "💰 Price Calculator Test:"
echo "   Base: \$999"
echo "   + Premium Rudder: \$150"
echo "   + Advanced Yoke: \$250"
echo "   + Arm Kit: \$199"
echo "   ─────────────────"
echo "   Total: \$1,598"
echo ""
echo "Clean up: rm -f $COOKIE_FILE"
echo ""

