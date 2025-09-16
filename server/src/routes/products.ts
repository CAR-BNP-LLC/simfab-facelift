import { Router, Request, Response } from 'express';
import multer from 'multer';
import { database } from '../database';
import { parseCSV, validateCSVProduct, convertCSVToProduct } from '../csvParser';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

// GET /products - Get all products
router.get('/', async (req: Request, res: Response) => {
  try {
    const products = await database.getAllProducts();
    res.json({
      success: true,
      data: products,
      count: products.length
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products'
    });
  }
});

// GET /products/:id - Get product by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid product ID'
      });
    }

    const product = await database.getProductById(id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Product not found'
      });
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product'
    });
  }
});

// POST /products - Create a new product
router.post('/', async (req: Request, res: Response) => {
  try {
    const productData = req.body;
    
    // Validate required fields
    if (!productData.sku || !productData.name) {
      return res.status(400).json({
        success: false,
        error: 'SKU and name are required'
      });
    }

    // Insert the product
    await database.insertProduct(productData);
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: productData
    });
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product'
    });
  }
});

// POST /products/upload - Upload products from CSV
router.post('/upload', upload.single('csv'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No CSV file provided'
      });
    }

    // Convert buffer to string
    const csvData = req.file.buffer.toString('utf-8');
    
    if (!csvData.trim()) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is empty'
      });
    }

    // Parse CSV data
    const csvProducts = await parseCSV(csvData);
    
    if (csvProducts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid products found in CSV'
      });
    }

    // Validate and convert products
    const validProducts: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < csvProducts.length; i++) {
      const csvProduct = csvProducts[i];
      const validation = validateCSVProduct(csvProduct);
      
      if (validation.isValid) {
        try {
          const product = convertCSVToProduct(csvProduct);
          validProducts.push(product);
        } catch (error) {
          errors.push(`Row ${i + 1}: Error converting product data`);
        }
      } else {
        errors.push(`Row ${i + 1}: ${validation.errors.join(', ')}`);
      }
    }

    if (validProducts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid products to upload',
        details: errors
      });
    }

    // Drop existing products table and recreate
    await database.dropProductsTable();

    // Insert new products
    let successCount = 0;
    let insertErrors: string[] = [];

    for (let i = 0; i < validProducts.length; i++) {
      try {
        await database.insertProduct(validProducts[i]);
        successCount++;
      } catch (error) {
        insertErrors.push(`Row ${i + 1}: Failed to insert product - ${error}`);
      }
    }

    res.json({
      success: true,
      message: `Successfully uploaded ${successCount} products`,
      data: {
        totalProcessed: csvProducts.length,
        validProducts: validProducts.length,
        successfullyInserted: successCount,
        validationErrors: errors,
        insertErrors: insertErrors
      }
    });

  } catch (error) {
    console.error('Error uploading products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload products'
    });
  }
});

export default router;
