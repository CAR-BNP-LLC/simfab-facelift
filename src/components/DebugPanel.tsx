import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Product {
  id: number;
  name: string;
  sku: string;
  regular_price?: number;
  sale_price?: number;
  stock?: number;
  categories?: string;
  brands?: string;
  created_at: string;
}

interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    totalProcessed: number;
    validProducts: number;
    successfullyInserted: number;
    validationErrors: string[];
    insertErrors: string[];
  };
}

const DebugPanel = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://simfabdev-d6add0a229a7.herokuapp.com/api';

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setProducts(data.data);
      } else {
        setError(data.error || 'Failed to fetch products');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Network error: ${errorMessage}. Make sure the server is running on ${API_BASE}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
      setUploadResult(null);
      setError(null);
    } else {
      setError('Please select a valid CSV file');
    }
  };

  const uploadCSV = async () => {
    if (!selectedFile) {
      setError('Please select a CSV file first');
      return;
    }

    setUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('csv', selectedFile);

    try {
      const response = await fetch(`${API_BASE}/products/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setUploadResult(data);
      
      if (data.success) {
        // Refresh products list after successful upload
        await fetchProducts();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Upload error: ${errorMessage}. Make sure the server is running on ${API_BASE}`);
    } finally {
      setUploading(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleData = `name,description,price,category,stock,sku,image_url
"Flight Simulator Cockpit","Professional flight simulator cockpit with realistic controls and instruments",2999.99,"Flight Simulation",5,"FS-COCKPIT-001","https://example.com/flight-cockpit.jpg"
"Racing Wheel Pro","High-end racing wheel with force feedback and realistic steering feel",899.99,"Sim Racing",12,"RW-PRO-002","https://example.com/racing-wheel.jpg"`;
    
    const blob = new Blob([sampleData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-products.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Debug Panel - Product Management</h2>
        <Button onClick={fetchProducts} disabled={loading} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Products
        </Button>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Upload className="w-5 h-5 mr-2" />
            Upload Products CSV
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="csv-file">Select CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            <p className="text-sm text-muted-foreground">
              Select a CSV file with product data. The file will replace all existing products.
            </p>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={uploadCSV} 
              disabled={!selectedFile || uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload CSV
                </>
              )}
            </Button>
            <Button onClick={downloadSampleCSV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Download Sample
            </Button>
          </div>

          {uploadResult && (
            <Alert className={uploadResult.success ? 'border-green-500' : 'border-red-500'}>
              {uploadResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription>
                <div className="font-medium">{uploadResult.message}</div>
                {uploadResult.data && (
                  <div className="mt-2 text-sm space-y-1">
                    <div>Total Processed: {uploadResult.data.totalProcessed}</div>
                    <div>Valid Products: {uploadResult.data.validProducts}</div>
                    <div>Successfully Inserted: {uploadResult.data.successfullyInserted}</div>
                    {uploadResult.data.validationErrors.length > 0 && (
                      <div className="text-red-600">
                        Validation Errors: {uploadResult.data.validationErrors.length}
                      </div>
                    )}
                    {uploadResult.data.insertErrors.length > 0 && (
                      <div className="text-red-600">
                        Insert Errors: {uploadResult.data.insertErrors.length}
                      </div>
                    )}
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({products.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert className="mb-4 border-red-500">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Loading products...
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products found. Upload a CSV file to get started.
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {products.map((product) => (
                <div key={product.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
                    </div>
                    <div className="text-right space-y-1">
                      {product.regular_price && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Regular: </span>
                          <span className="font-medium">${product.regular_price}</span>
                        </div>
                      )}
                      {product.sale_price && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Sale: </span>
                          <span className="font-medium text-green-600">${product.sale_price}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {product.stock !== undefined && (
                      <span>Stock: {product.stock}</span>
                    )}
                    {product.categories && (
                      <span>Category: {product.categories}</span>
                    )}
                    {product.brands && (
                      <span>Brand: {product.brands}</span>
                    )}
                    <span>Added: {new Date(product.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugPanel;
