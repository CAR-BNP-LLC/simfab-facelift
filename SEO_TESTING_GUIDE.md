# SEO Testing Guide

## Quick Testing Checklist

### 1. **Meta Tags Testing**

#### Test Dynamic Meta Tags on Each Page Type:

**Product Pages:**
1. Open any product page: `http://localhost:5173/product/[product-slug]`
2. Right-click → "View Page Source" (or `Ctrl+U` / `Cmd+U`)
3. Check `<head>` section for:
   - `<title>` - Should be dynamic based on product (e.g., "DCS Flight Sim Modular Cockpit | Complete Modular Cockpit System | SimFab")
   - `<meta name="description">` - Should be product-specific
   - `<link rel="canonical">` - Should be absolute URL: `http://localhost:5173/product/[slug]`
   - Open Graph tags (`og:title`, `og:description`, `og:image`, `og:type="product"`)
   - Twitter Card tags
   - Product-specific OG tags (`product:price:amount`, `product:availability`)

**Category Pages:**
- `/flight-sim` - Should have "Flight Simulator Cockpits & Mounting Systems | Complete Modular Solutions | SimFab"
- `/sim-racing` - Should have "Sim Racing Cockpits & Wheel Mounts | Complete Racing Setup | SimFab"
- `/monitor-stands` - Should have "Monitor Stands for Sim Racing & Flight Sim | Triple Monitor Mounts | SimFab"

**Homepage:**
- `/` - Should have "SimFab - Complete Modular Flight Sim & Racing Cockpit Systems | Professional Simulation Equipment"

**Special Pages:**
- `/assembly-manuals` - Should have "Assembly Manuals & Setup Guides | SimFab Cockpit Installation | SimFab"

### 2. **JSON-LD Structured Data Testing**

#### Google Rich Results Test:
1. Go to: https://search.google.com/test/rich-results
2. Enter your page URL (or paste HTML source)
3. Check for:
   - **Product schema** on product pages
   - **Organization schema** on homepage
   - **BreadcrumbList schema** on all pages
   - **ItemList schema** on category pages

#### Manual Check in Page Source:
1. View page source
2. Search for `<script type="application/ld+json">`
3. Copy the JSON and validate at: https://validator.schema.org/

**Expected Schemas:**
- **Product pages**: Product schema + BreadcrumbList
- **Category pages**: ItemList + BreadcrumbList
- **Homepage**: Organization + BreadcrumbList
- **Other pages**: BreadcrumbList

### 3. **Sitemap Testing**

#### Check Sitemap Accessibility:
1. Visit: `http://localhost:5173/sitemap.xml`
2. Should return valid XML
3. Check for:
   - All category pages (priority 0.9)
   - All product pages with correct priorities:
     - Base cockpits: 0.85
     - Add-on modules: 0.8
     - Accessories: 0.75
   - Static pages (priority 0.7)
   - No empty `<loc>` tags
   - Valid URLs (no localhost in production)

#### Validate XML:
- Use: https://www.xml-sitemaps.com/validate-xml-sitemap.html
- Or: https://validator.w3.org/

### 4. **Robots.txt Testing**

1. Visit: `http://localhost:5173/robots.txt`
2. Should show:
   ```
   User-agent: *
   Allow: /
   Disallow: /admin
   Disallow: /checkout
   Disallow: /cart
   Disallow: /profile
   Disallow: /api/
   Disallow: /login
   Disallow: /register
   
   Sitemap: https://simfab.com/sitemap.xml
   ```

### 5. **Canonical URLs Testing**

1. Open any page
2. View page source
3. Search for `<link rel="canonical"`
4. Verify:
   - Absolute URLs (not relative)
   - No query parameters
   - No trailing slashes (except homepage)
   - Correct domain

### 6. **Open Graph Testing**

#### Facebook Sharing Debugger:
1. Go to: https://developers.facebook.com/tools/debug/
2. Enter your page URL
3. Click "Scrape Again" to see how Facebook sees your page
4. Check:
   - og:title
   - og:description
   - og:image
   - og:url

#### Twitter Card Validator:
1. Go to: https://cards-dev.twitter.com/validator
2. Enter your page URL
3. Check Twitter card preview

### 7. **Browser DevTools Testing**

#### Chrome DevTools:
1. Open DevTools (F12)
2. Go to "Elements" tab
3. Expand `<head>` section
4. Verify all meta tags are present
5. Check that Helmet is working (tags should be in `<head>`)

#### Network Tab:
1. Open DevTools → Network tab
2. Reload page
3. Check that no 404s for:
   - `/sitemap.xml`
   - `/robots.txt`
   - Schema JSON-LD scripts

### 8. **Product-Specific SEO Testing**

Test different product types:

**Base Cockpit:**
- Title should include "Complete Modular Cockpit System"
- Description should mention "complete system", "includes seat, chassis"
- Priority in sitemap: 0.85

**Add-On Module (Flight Sim #1-13):**
- Title should include "Flight Sim Add-On Module"
- Description should mention compatibility
- Priority in sitemap: 0.8

**Accessory:**
- Title should include "Simulator Accessory"
- Priority in sitemap: 0.75

### 9. **Mobile SEO Testing**

1. Use Chrome DevTools mobile emulator
2. Check meta viewport tag: `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`
3. Test responsive design (affects mobile SEO)

### 10. **Page Speed Testing**

1. Google PageSpeed Insights: https://pagespeed.web.dev/
2. Enter your URL
3. Check Core Web Vitals
4. Review SEO score

### 11. **Accessibility Testing (Affects SEO)**

1. Use browser extensions:
   - WAVE (Web Accessibility Evaluation Tool)
   - axe DevTools
2. Check for:
   - Alt text on images
   - Proper heading hierarchy (H1, H2, H3)
   - Semantic HTML

## Automated Testing Scripts

### Quick Test Commands:

```bash
# Test sitemap is accessible
curl http://localhost:5173/sitemap.xml | head -20

# Test robots.txt
curl http://localhost:5173/robots.txt

# Test a product page meta tags
curl -s http://localhost:5173/product/[slug] | grep -E '<title>|<meta name="description"|<link rel="canonical"'
```

## Production Checklist

Before going live:

- [ ] Set `FRONTEND_URL` environment variable in production
- [ ] Update `robots.txt` sitemap URL to production domain
- [ ] Verify all canonical URLs use production domain
- [ ] Test sitemap at production URL
- [ ] Submit sitemap to Google Search Console
- [ ] Verify Open Graph images are absolute URLs
- [ ] Test all product pages have unique meta tags
- [ ] Check JSON-LD schemas validate
- [ ] Verify no console errors related to SEO

## Common Issues to Check

1. **Missing meta tags**: Check if HelmetProvider is wrapping the app
2. **Duplicate titles**: Verify each page has unique title
3. **Empty descriptions**: Check if products have `seo_description` or fallback works
4. **Broken canonical URLs**: Verify `getCanonicalUrl()` function works
5. **Invalid JSON-LD**: Use schema.org validator
6. **Sitemap 404**: Check proxy configuration and backend route

## Tools for Ongoing Monitoring

1. **Google Search Console**: Monitor indexing, search queries, CTR
2. **Google Analytics**: Track organic traffic
3. **Schema Markup Validator**: https://validator.schema.org/
4. **Screaming Frog SEO Spider**: Crawl and audit site
5. **Ahrefs/SEMrush**: Track keyword rankings

## Quick Verification Commands

```bash
# Check if sitemap is valid XML
curl -s http://localhost:5173/sitemap.xml | xmllint --format -

# Count products in sitemap
curl -s http://localhost:5173/sitemap.xml | grep -c '<loc>.*product'

# Check for empty slugs
curl -s http://localhost:5173/sitemap.xml | grep '<loc></loc>'
```

