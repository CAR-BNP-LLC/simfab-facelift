/**
 * Sitemap Routes
 * Generate XML sitemap for SEO
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export const createSitemapRoutes = (pool: Pool): Router => {
  const router = Router();

  /**
   * @route   GET /sitemap.xml
   * @desc    Generate XML sitemap
   * @access  Public
   */
  router.get('/sitemap.xml', async (req: Request, res: Response) => {
    try {
      // Determine base URL - use environment variable, or infer from request in development
      let baseUrl = process.env.FRONTEND_URL || 'https://simfab.com';
      
      // In development, if FRONTEND_URL is not set, try to infer from request
      if (baseUrl === 'https://simfab.com' && process.env.NODE_ENV !== 'production') {
        const protocol = req.protocol;
        const host = req.get('host');
        if (host && (host.includes('localhost') || host.includes('127.0.0.1'))) {
          // Use the frontend dev server URL if proxied
          baseUrl = `${protocol}://${host.replace(':3001', ':5173')}`;
        }
      }
      
      // Get all active products (status='active', deleted_at IS NULL, with valid slugs)
      const productsResult = await pool.query(`
        SELECT id, slug, categories, updated_at, name
        FROM products
        WHERE status = 'active' 
          AND deleted_at IS NULL
          AND slug IS NOT NULL
          AND slug != ''
        ORDER BY id ASC
      `);

      const products = productsResult.rows;

      // Categorize products
      const baseCockpits: any[] = [];
      const addOnModules: any[] = [];
      const accessories: any[] = [];

      products.forEach((product: any) => {
        const categories = product.categories 
          ? (typeof product.categories === 'string' 
              ? JSON.parse(product.categories) 
              : product.categories)
          : [];
        
        const isCockpit = categories.some((cat: string) => 
          cat.toLowerCase().includes('cockpit') || 
          cat.toLowerCase() === 'flight-sim' ||
          cat.toLowerCase() === 'sim-racing'
        );
        
        const isAddOn = product.name?.includes('Flight Sim #') || 
                       product.name?.toLowerCase().includes('add-on') ||
                       product.name?.toLowerCase().includes('module');
        
        if (isCockpit) {
          baseCockpits.push(product);
        } else if (isAddOn) {
          addOnModules.push(product);
        } else {
          accessories.push(product);
        }
      });

      // Generate XML
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      // Homepage
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}/</loc>\n`;
      xml += '    <priority>1.0</priority>\n';
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '  </url>\n';

      // Category pages
      const categoryPages = [
        { path: '/flight-sim', priority: '0.9' },
        { path: '/sim-racing', priority: '0.9' },
        { path: '/monitor-stands', priority: '0.9' },
        { path: '/assembly-manuals', priority: '0.9' },
        { path: '/compatible-brands', priority: '0.9' }
      ];

      categoryPages.forEach(page => {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}${page.path}</loc>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '  </url>\n';
      });

      // Base cockpit products (priority 0.85)
      baseCockpits.forEach((product: any) => {
        // Skip products without valid slugs
        if (!product.slug || product.slug.trim() === '') {
          return;
        }
        
        const lastmod = product.updated_at 
          ? new Date(product.updated_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/product/${product.slug}</loc>\n`;
        xml += '    <priority>0.85</priority>\n';
        xml += '    <changefreq>monthly</changefreq>\n';
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += '  </url>\n';
      });

      // Add-on modules (priority 0.8)
      addOnModules.forEach((product: any) => {
        // Skip products without valid slugs
        if (!product.slug || product.slug.trim() === '') {
          return;
        }
        
        const lastmod = product.updated_at 
          ? new Date(product.updated_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/product/${product.slug}</loc>\n`;
        xml += '    <priority>0.8</priority>\n';
        xml += '    <changefreq>monthly</changefreq>\n';
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += '  </url>\n';
      });

      // Accessories (priority 0.75)
      accessories.forEach((product: any) => {
        // Skip products without valid slugs
        if (!product.slug || product.slug.trim() === '') {
          return;
        }
        
        const lastmod = product.updated_at 
          ? new Date(product.updated_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];
        
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}/product/${product.slug}</loc>\n`;
        xml += '    <priority>0.75</priority>\n';
        xml += '    <changefreq>monthly</changefreq>\n';
        xml += `    <lastmod>${lastmod}</lastmod>\n`;
        xml += '  </url>\n';
      });

      // Static pages (priority 0.7)
      const staticPages = [
        '/faq',
        '/terms-conditions',
        '/privacy-policy',
        '/international-shipping',
        '/backorders'
      ];

      staticPages.forEach(page => {
        xml += '  <url>\n';
        xml += `    <loc>${baseUrl}${page}</loc>\n`;
        xml += '    <priority>0.7</priority>\n';
        xml += '    <changefreq>monthly</changefreq>\n';
        xml += '  </url>\n';
      });

      xml += '</urlset>';

      res.setHeader('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  return router;
};
