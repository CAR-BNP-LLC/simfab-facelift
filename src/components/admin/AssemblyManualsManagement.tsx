import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Download, QrCode, Search, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface AssemblyManual {
  id: number;
  name: string;
  description?: string;
  file_url: string;
  file_type: string;
  file_size?: number;
  thumbnail_url?: string;
  qr_code_url?: string;
  qr_code_data?: string;
  is_public: boolean;
  sort_order: number;
  assigned_products?: Array<{
    id: number;
    name: string;
    slug: string;
  }>;
}

interface Product {
  id: number;
  name: string;
  slug: string;
}

const AssemblyManualsManagement = () => {
  const [manuals, setManuals] = useState<AssemblyManual[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingManual, setEditingManual] = useState<AssemblyManual | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_public: true,
    sort_order: 0
  });
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    fetchManuals();
    fetchProducts();
  }, []);

  const fetchManuals = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/admin/assembly-manuals`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setManuals(data.data || []);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch manuals');
      }
    } catch (error) {
      console.error('Failed to fetch manuals:', error);
      toast({
        title: 'Error',
        description: 'Failed to load manuals',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/products?limit=1000`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        // Handle paginated response
        const productList = data.data?.products || data.data || [];
        setProducts(productList);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast({
        title: 'Error',
        description: 'Failed to load products',
        variant: 'destructive'
      });
    }
  };

  const handleCreate = () => {
    setEditingManual(null);
    setFormData({
      name: '',
      description: '',
      is_public: true,
      sort_order: 0
    });
    setSelectedProducts([]);
    setFile(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (manual: AssemblyManual) => {
    setEditingManual(manual);
    setFormData({
      name: manual.name,
      description: manual.description || '',
      is_public: manual.is_public,
      sort_order: manual.sort_order
    });
    setSelectedProducts(manual.assigned_products?.map(p => p.id) || []);
    setFile(null);
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      if (!editingManual && !file) {
        toast({
          title: 'Error',
          description: 'PDF file is required for new manuals',
          variant: 'destructive'
        });
        setUploading(false);
        return;
      }

      if (!editingManual) {
        // Create new manual
        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name);
        formDataToSend.append('description', formData.description);
        formDataToSend.append('is_public', formData.is_public.toString());
        formDataToSend.append('sort_order', formData.sort_order.toString());
        formDataToSend.append('file', file!);

        if (selectedProducts.length > 0) {
          selectedProducts.forEach(id => {
            formDataToSend.append('product_ids[]', id.toString());
          });
        }

        const response = await fetch(`${API_URL}/api/admin/assembly-manuals`, {
          method: 'POST',
          credentials: 'include',
          body: formDataToSend
        });

        const data = await response.json();
        if (data.success) {
          toast({
            title: 'Success',
            description: 'Manual created successfully'
          });
          setIsDialogOpen(false);
          setFormData({ name: '', description: '', is_public: true, sort_order: 0 });
          setSelectedProducts([]);
          setFile(null);
          await fetchManuals();
        } else {
          throw new Error(data.error?.message || 'Failed to create manual');
        }
      } else {
        // Update existing manual
        const response = await fetch(`${API_URL}/api/admin/assembly-manuals/${editingManual.id}`, {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        });

        const data = await response.json();
        if (data.success) {
          // Assign products separately
          await fetch(`${API_URL}/api/admin/assembly-manuals/${editingManual.id}/assign-products`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ product_ids: selectedProducts })
          });

          toast({
            title: 'Success',
            description: 'Manual updated successfully'
          });
          setIsDialogOpen(false);
          fetchManuals();
        } else {
          throw new Error(data.error?.message || 'Failed to update manual');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Operation failed',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this manual? This cannot be undone.')) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/assembly-manuals/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'Manual deleted successfully'
        });
        fetchManuals();
      } else {
        throw new Error(data.error?.message || 'Failed to delete manual');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete manual',
        variant: 'destructive'
      });
    }
  };

  const handleRegenerateQR = async (id: number) => {
    try {
      const response = await fetch(`${API_URL}/api/admin/assembly-manuals/${id}/regenerate-qr`, {
        method: 'POST',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        toast({
          title: 'Success',
          description: 'QR code regenerated successfully'
        });
        fetchManuals();
      } else {
        throw new Error(data.error?.message || 'Failed to regenerate QR code');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to regenerate QR code',
        variant: 'destructive'
      });
    }
  };

  const filteredManuals = manuals.filter(manual =>
    manual.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    manual.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Assembly Manuals</h2>
          <p className="text-muted-foreground">Manage assembly manuals and assign them to products</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Upload Manual
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search manuals by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Manuals List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading manuals...</p>
        </div>
      ) : filteredManuals.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">
              {searchTerm ? 'No manuals found matching your search.' : 'No manuals yet. Upload your first manual to get started.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredManuals.map((manual) => (
            <Card key={manual.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg">{manual.name}</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(manual)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(manual.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {manual.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {manual.description}
                  </p>
                )}

                {manual.assigned_products && manual.assigned_products.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Assigned to:</p>
                    <div className="flex gap-2 flex-wrap">
                      {manual.assigned_products.map((product) => (
                        <Badge key={product.id} variant="secondary" className="text-xs">
                          {product.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(`${API_URL}${manual.file_url}`, '_blank')}
                      className="flex-1"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download PDF
                    </Button>
                    {manual.qr_code_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`${API_URL}${manual.qr_code_url}`, '_blank')}
                        className="flex-1"
                      >
                        <QrCode className="w-4 h-4 mr-2" />
                        QR Code
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRegenerateQR(manual.id)}
                      title="Regenerate QR Code"
                    >
                      <QrCode className="w-4 h-4" />
                    </Button>
                  </div>
                  {manual.is_public && (
                    <Link to={`/manuals/${manual.id}`} target="_blank" rel="noopener noreferrer">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on Site
                      </Button>
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {manual.is_public ? (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Public
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-gray-600">
                      Private
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingManual ? 'Edit Manual' : 'Upload New Manual'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Manual Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Assembly Guide v2.0"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Optional description of the manual"
              />
            </div>

            {!editingManual && (
              <div>
                <Label htmlFor="file">PDF File *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum file size: 10MB
                </p>
              </div>
            )}

            <div>
              <Label>Assign to Products</Label>
              <div className="max-h-48 overflow-y-auto border rounded p-3 space-y-2 bg-muted/50">
                {products.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No products available</p>
                ) : (
                  products.map((product) => (
                    <div key={product.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedProducts([...selectedProducts, product.id]);
                          } else {
                            setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={`product-${product.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {product.name}
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_public: checked as boolean })
                }
              />
              <label htmlFor="is_public" className="text-sm cursor-pointer">
                Make publicly viewable (required for QR code scanning)
              </label>
            </div>

            <div>
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) =>
                  setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                }
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Lower numbers appear first
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? 'Processing...' : editingManual ? 'Update' : 'Upload'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssemblyManualsManagement;

