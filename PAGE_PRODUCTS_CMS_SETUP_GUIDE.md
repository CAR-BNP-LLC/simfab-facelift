# Page Products CMS - Setup Guide

## 📋 Quick Start

### Step 1: Run Database Migration

Navigate to the server directory and run the migration:

```bash
cd server
npm run migrate:up
```

This will create the `page_products` table and set up all necessary indexes.

### Step 2: Access Admin Dashboard

1. Log in to the admin dashboard at `/admin`
2. Navigate to the **"Page Products"** tab
3. You should see a list of all configured pages and their sections

### Step 3: Configure Products for Pages

#### For Sim Racing Page (`/sim-racing`)
1. Find "Sim Racing" in the page list
2. Click **"Edit"** next to "Base Models" section
3. Click **"Add Product"** button
4. Search and select products (e.g., "GEN3 Modular Racing Sim Cockpit")
5. Add more products as needed
6. Drag products to reorder them
7. Toggle products active/inactive as needed
8. Click **"Save Changes"**

#### For Flight Sim Page (`/flight-sim`)
1. Find "Flight Sim" in the page list
2. Click **"Edit"** next to "Base Models" section
3. Add products using the same process

#### For Monitor Stands Page (`/monitor-stands`)
This page has two sections:
- **Main Products**: Edit to add main monitor stand products
- **Add-Ons**: Edit to add accessory products

#### For Homepage Sections
The homepage uses special sections:
- `homepage` → `sim-racing-section`
- `homepage` → `flight-sim-section`
- `homepage` → `monitor-stands-section`

---

## 🎯 Features Guide

### Drag & Drop Reordering
- Products are automatically saved when dragged to a new position
- Order determines display sequence on frontend pages
- Visual feedback during dragging

### Active/Inactive Toggle
- Use the eye icon toggle to activate/deactivate products
- Inactive products won't appear on frontend pages
- Useful for temporarily hiding products without removing them

### Category Mode
- Instead of manually selecting products, you can set a category
- All active products from that category will be shown
- Automatically limited to `maxItems` number of products
- Useful for dynamic product listings

### Adding Products
1. Click **"Add Product"** button
2. Search by product name or SKU
3. Products already in the section won't appear in search results
4. Click **"Add"** on any product card to add it

### Removing Products
1. Click the trash icon on any product card
2. Confirm deletion in the dialog
3. Product is removed from the section (but not deleted from catalog)

---

## 🔍 Page Route Reference

| Page Route | Page Name | Sections | Description |
|------------|-----------|----------|-------------|
| `/sim-racing` | Sim Racing | `base-models` | Main page product cards |
| `/flight-sim` | Flight Sim | `base-models` | Main page product cards |
| `/monitor-stands` | Monitor Stands | `main-products`, `add-ons` | Two separate sections |
| `homepage` | Homepage | `sim-racing-section`, `flight-sim-section`, `monitor-stands-section` | Homepage component products |

---

## 🚨 Troubleshooting

### No Products Showing on Frontend
1. Check that products are assigned in Admin → Page Products
2. Ensure products are set to **Active** (eye icon visible)
3. Verify products exist in the Products catalog
4. Check browser console for API errors

### Products Not Saving
1. Ensure you clicked **"Save Changes"** button
2. Check for unsaved changes indicator (yellow alert)
3. Verify you have admin permissions
4. Check network tab for API errors

### Drag & Drop Not Working
1. Ensure you're dragging by the grip icon (⋮⋮)
2. Products save automatically when dropped
3. Check for error toasts if order doesn't persist

### Category Mode Not Showing Products
1. Verify category ID matches actual product categories
2. Ensure products in category are active
3. Check `maxItems` setting (may be limiting results)
4. Products are sorted by featured status first

---

## 📝 Best Practices

1. **Product Ordering**: Order products by priority/importance
   - Most important products first
   - Featured products at top
   - Sale items prominently placed

2. **Active/Inactive Management**:
   - Use inactive state instead of deleting
   - Easier to reactivate later
   - Maintains order history

3. **Homepage Sections**:
   - Keep products limited (2-4 max)
   - Focus on best sellers or featured items
   - Update seasonally for promotions

4. **Category Mode**:
   - Use for sections that should auto-update
   - Set appropriate `maxItems` limit
   - Ensure category naming is consistent

---

## 🔄 Migration from Hardcoded Data

If you had hardcoded products before, you can manually recreate them:

1. For each hardcoded product array, identify the actual products in your catalog
2. Use admin dashboard to add them to appropriate sections
3. Set display order to match original order
4. Test frontend pages to verify display

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Database migration completed successfully
- [ ] Admin "Page Products" tab is visible
- [ ] Can add products to sections
- [ ] Drag & drop reordering works
- [ ] Active/inactive toggle works
- [ ] Frontend pages load products correctly
- [ ] Product links navigate to detail pages
- [ ] Images display properly
- [ ] Pricing shows correctly

---

**Happy Managing! 🎉**


