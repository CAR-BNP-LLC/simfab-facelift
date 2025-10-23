# 🎨 Admin Dashboard - Quick Start Guide

**No scripts needed! Manage everything visually in your browser.**

---

## 🚀 Access the Admin Dashboard

### Step 1: Make sure both servers are running

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
npm run dev
```

### Step 2: Open Admin Dashboard

```
http://localhost:5173/admin
```

✅ **That's it!** No login required for testing.

---

## 📦 Creating Your First Product

### 1. Click "Create Product" Tab

You'll see a form with all the fields you need.

### 2. Fill in the Form

**Required fields:**
- **SKU**: Unique product code (e.g., `FS-TRAINER-001`)
- **Product Name**: Full name (e.g., `SimFab Flight Sim Trainer Station`)
- **URL Slug**: Auto-generated from name (e.g., `flight-sim-trainer-station`)
- **Price**: Regular price in dollars (e.g., `999.00`)

**Optional fields:**
- **Short Description**: One-liner for product cards
- **Full Description**: Detailed product info
- **Stock Quantity**: Default is 10
- **Product Type**: Simple, Variable, or Configurable
- **Status**: Active, Draft, or Inactive
- **Category**: Flight Sim, Sim Racing, Accessories, etc.
- **Tags**: Comma-separated (e.g., `best-seller, modular, professional`)
- **Featured**: Check to show on homepage

### 3. Click "Create Product"

✅ Product created and appears in the Products tab!

---

## 📝 Example: Create Flight Sim Trainer

Fill in the form with:

```
SKU: FS-TRAINER-001
Product Name: SimFab Flight Sim Trainer Station
URL Slug: flight-sim-trainer-station (auto-filled)
Short Description: Your Gateway to Precision Aviation Training
Description: Professional flight simulator cockpit with modular design...
Price: 999.00
Stock Quantity: 15
Product Type: Configurable
Status: Active
Category: Flight Sim
Tags: best-seller, modular, professional
☑ Featured Product
```

Click **"Create Product"** → Done! 🎉

---

## 📋 Managing Products

### View All Products

Click the **"Products"** tab to see:
- Product list table
- ID, SKU, Name, Price, Stock, Status
- Edit, Delete, and View buttons

### Edit a Product

1. Click the **Edit** button (pencil icon)
2. Form pre-fills with product data
3. Change any fields
4. Click **"Update Product"**

✅ Product updated!

### Delete a Product

1. Click the **Delete** button (trash icon)
2. Confirm deletion
3. Product removed

⚠️ **Warning**: Deletion is permanent!

### View on Shop

Click the **"View"** button to open the product on the shop page in a new tab.

---

## 🎯 Quick Product Creation Examples

### Simple Product (Monitor Stand)

```
SKU: ACC-MONITOR-001
Name: SimFab Single Monitor Mount Stand
Slug: single-monitor-stand
Type: Simple
Price: 219.00
Stock: 25
Category: Monitor Stands
Status: Active
```

### Configurable Product (Racing Cockpit)

```
SKU: SR-RACING-001
Name: Gen3 Racing Modular Cockpit
Slug: gen3-racing-cockpit
Type: Configurable
Price: 799.00
Stock: 10
Category: Sim Racing
Featured: ☑
Status: Active
```

### Accessory Product

```
SKU: ACC-CUSHION-001
Name: Racing Seat Cushion Set
Slug: racing-seat-cushion
Type: Simple
Price: 79.99
Stock: 50
Category: Accessories
```

---

## 🔍 Testing Workflow

### Create → Test → Edit Workflow

1. **Create** a product in admin
2. **Go to Products tab** to verify it's there
3. **Click "View"** to see it on shop
4. **Test on Shop page**: `http://localhost:5173/shop`
5. **Test Detail page**: Click "BUY NOW"
6. **Edit if needed**: Back to admin, click Edit
7. **Delete if unwanted**: Click trash icon

---

## 📊 Dashboard Stats

The admin dashboard shows:
- **Total Products**: Count of all products
- **In Stock**: Products with stock > 0  
- **Featured**: Products marked as featured

---

## 🎨 Features

### ✅ Product Management
- Create new products
- Edit existing products
- Delete products
- View all products in table
- Quick stats dashboard

### ✅ User Experience
- Simple form interface
- Auto-generate slug from name
- Real-time feedback (toasts)
- Loading states
- Error handling
- Confirmation dialogs

### ✅ Quick Links
- View Shop Page
- Test API endpoints
- Health check

---

## 🔄 Testing the Full Flow

### Complete Test Scenario

**1. Create Product**
- Go to `/admin`
- Click "Create Product"
- Fill in Flight Sim Trainer (use example above)
- Click "Create Product"
- ✅ See success toast

**2. Verify in Products List**
- Click "Products" tab
- ✅ See your product in the table

**3. Test on Shop**
- Click Quick Links → "View Shop Page"
- ✅ See your product in the grid

**4. Test Product Detail**
- Click "BUY NOW" on your product
- ✅ Product detail page loads
- ✅ Shows correct price

**5. Edit Product**
- Back to `/admin`
- Click Edit button (pencil icon)
- Change price to `1099.00`
- Click "Update Product"
- ✅ Price updated

**6. Verify Update**
- Go back to shop
- ✅ New price shows

**Success!** Full CRUD cycle working! 🎉

---

## 💡 Pro Tips

### Tip 1: Use Auto-Slug
Just type the product name, and the slug auto-generates. You can edit it if needed.

### Tip 2: Test Different Types
- **Simple**: Fixed price, no variations (e.g., cushion)
- **Variable**: Multiple options (future feature)
- **Configurable**: Complex with variations (e.g., cockpit)

### Tip 3: Use Categories Wisely
Categories help organize products:
- `flight-sim` - Flight simulation products
- `sim-racing` - Racing simulation products
- `cockpits` - Cockpit frames
- `monitor-stands` - Monitor mounts
- `accessories` - Add-ons and extras

### Tip 4: Featured Products
Check "Featured Product" to show on homepage and featured section.

### Tip 5: Stock Management
- Set to `0` for out of stock
- Product will show "OUT OF STOCK" on shop

---

## 🎯 Creating Products for Testing

### Recommended Test Products

**Create these 6 products for comprehensive testing:**

1. **Flight Sim Trainer** (Configurable)
   - SKU: `FS-TRAINER-001`
   - Price: `999.00`
   - Category: `flight-sim`
   - Featured: Yes

2. **Racing Cockpit** (Configurable)
   - SKU: `SR-RACING-001`
   - Price: `799.00`
   - Category: `sim-racing`
   - Featured: Yes

3. **Monitor Stand** (Simple)
   - SKU: `ACC-MONITOR-001`
   - Price: `219.00`
   - Category: `monitor-stands`

4. **Keyboard Arm** (Simple)
   - SKU: `ACC-ARM-001`
   - Price: `199.00`
   - Category: `accessories`

5. **Seat Cushion** (Simple)
   - SKU: `ACC-CUSHION-001`
   - Price: `79.99`
   - Category: `accessories`

6. **Rudder Pedals** (Simple, Out of Stock)
   - SKU: `FS-RUDDER-001`
   - Price: `299.00`
   - Stock: `0`
   - Category: `flight-sim`

**Time to create all 6**: About 5 minutes

---

## 🔧 Advanced: Adding Variations (Manual for now)

For now, variations need to be added via API or SQL. 

**Quick SQL Method:**

```sql
psql simfab_dev

-- Add variation to product ID 1
INSERT INTO product_variations (product_id, variation_type, name, is_required)
VALUES (1, 'dropdown', 'Rudder Pedals', true)
RETURNING id;

-- Add options (use variation ID from above)
INSERT INTO variation_options (variation_id, option_name, option_value, price_adjustment, is_default)
VALUES 
(1, 'Standard', 'standard', 0, true),
(1, 'Premium', 'premium', 150, false),
(1, 'Custom', 'custom', 300, false);
```

**UI for variations coming in future update!**

---

## ⚠️ Important Notes

### Testing Mode Active
- ⚠️ **Everyone is an admin** (no authentication required)
- ⚠️ **For testing only** - don't use in production
- ⚠️ Remove auth bypass before going live

### Current Limitations
- Image upload: Not in UI yet (use placeholders)
- Variations: Add via SQL/API for now
- Colors: Add via SQL/API for now
- Add-ons: Add via SQL/API for now

### What's Fully Working
- ✅ Create products
- ✅ Edit products
- ✅ Delete products
- ✅ View products list
- ✅ Stock management
- ✅ Featured toggle
- ✅ Category selection
- ✅ Status management

---

## 🎉 Success Checklist

After using the admin dashboard, you should be able to:

- [x] Access admin at `/admin`
- [x] See the create product form
- [x] Fill in product details
- [x] Create a product
- [x] See success notification
- [x] View product in products list
- [x] Edit a product
- [x] Delete a product
- [x] See stats update
- [x] View product on shop page
- [x] See product on detail page

**All working = Admin Dashboard SUCCESS!** ✅

---

## 📚 Next Steps

### After Creating Products

1. **Test Shop Page**: See products display
2. **Test Search**: Find products by name
3. **Test Filters**: Filter by category
4. **Test Product Detail**: View full details
5. **Add Variations**: Use SQL or API
6. **Test Price Calculator**: See dynamic pricing

### Future Admin Features (Phase 6)

- 📸 Image upload UI
- 🎨 Visual variation builder
- 🎨 Color picker
- ➕ Add-on manager
- 📊 Sales analytics
- 📦 Order management
- 👥 User management
- ⚙️ Settings panel

---

## 💡 Quick Reference

### Access Points
- **Admin Dashboard**: `http://localhost:5173/admin`
- **Shop Page**: `http://localhost:5173/shop`
- **API Docs**: Click "Quick Links" in admin

### Common Actions
- **Create**: Fill form → Click "Create Product"
- **Edit**: Click pencil icon → Update → Save
- **Delete**: Click trash icon → Confirm
- **View**: Click "View" → Opens in new tab

### Keyboard Shortcuts
- **Tab**: Navigate form fields
- **Enter**: Submit form (when in text field)
- **Esc**: Close modals/dialogs

---

## 🎊 You're Ready!

**No more command-line scripts!** 

Just use the visual admin dashboard at:

```
http://localhost:5173/admin
```

Create products, manage inventory, and test everything visually! 🎉

---

**Happy Testing!** 🚀

