/**
 * Page Products Tab Component
 * Admin interface for managing products displayed on specific pages
 */

import { useState, useEffect } from 'react';
import { FileText, Edit, Eye, Loader2, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { pageProductsAPI, PageConfiguration } from '@/services/api';
import PageProductEditDialog from './PageProductEditDialog';

export default function PageProductsTab() {
  const [configs, setConfigs] = useState<PageConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageFilter, setPageFilter] = useState<string>('all');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<string>('');
  const [editingSection, setEditingSection] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    fetchPageConfigs();
  }, []);

  const fetchPageConfigs = async () => {
    try {
      setLoading(true);
      const response = await pageProductsAPI.getAllPagesConfig();
      if (response.success) {
        setConfigs(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching page configs:', error);
      const errorMessage = error.code === 'MIGRATION_REQUIRED'
        ? 'Database migration required. The page_products table does not exist. Please run migration 036.'
        : 'Failed to load page configurations';
      
      toast({
        title: error.code === 'MIGRATION_REQUIRED' ? 'Migration Required' : 'Error',
        description: errorMessage,
        variant: 'destructive',
        duration: error.code === 'MIGRATION_REQUIRED' ? 10000 : 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (pageRoute: string, section: string) => {
    setEditingPage(pageRoute);
    setEditingSection(section);
    setEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
    setEditingPage('');
    setEditingSection('');
    fetchPageConfigs(); // Refresh after editing
  };

  const filteredConfigs = configs.filter(config => {
    const matchesSearch = 
      config.pageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      config.pageRoute.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesPageFilter = pageFilter === 'all' || config.pageRoute === pageFilter;
    
    return matchesSearch && matchesPageFilter;
  });

  const uniquePageRoutes = Array.from(new Set(configs.map(c => c.pageRoute)));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Page Products CMS</h2>
          <p className="text-muted-foreground mt-1">
            Manage which products are featured on each page
          </p>
        </div>
        <Button onClick={fetchPageConfigs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={pageFilter} onValueChange={setPageFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pages</SelectItem>
            {uniquePageRoutes.map(route => (
              <SelectItem key={route} value={route}>
                {configs.find(c => c.pageRoute === route)?.pageName || route}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Page List */}
      {filteredConfigs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              {searchQuery || pageFilter !== 'all' 
                ? 'No pages match your filters'
                : 'No page configurations found. Products will not be displayed on pages.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredConfigs.map((config) => (
            <Card key={config.pageRoute}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {config.pageRoute === 'homepage' || config.pageRoute === '/homepage' ? (
                    <Home className="h-5 w-5" />
                  ) : (
                    <FileText className="h-5 w-5" />
                  )}
                  <span>{config.pageName}</span>
                  <Badge variant="outline" className="ml-2">
                    {config.pageRoute}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {config.sections.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sections configured</p>
                  ) : (
                    config.sections.map((section) => (
                      <div
                        key={section.sectionKey}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h4 className="font-medium">{section.sectionName}</h4>
                            <Badge variant="secondary">
                              {section.productCount} {section.productCount === 1 ? 'product' : 'products'}
                            </Badge>
                            {section.displayType === 'category' && (
                              <Badge variant="outline">
                                Category: {section.categoryId || 'N/A'}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Display Type: {section.displayType}
                            {section.maxItems && ` • Max Items: ${section.maxItems}`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(config.pageRoute, section.sectionKey)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              window.open(
                                config.pageRoute === 'homepage' || config.pageRoute === '/homepage'
                                  ? '/'
                                  : config.pageRoute,
                                '_blank'
                              );
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <PageProductEditDialog
        open={editDialogOpen}
        onClose={handleDialogClose}
        pageRoute={editingPage}
        section={editingSection}
      />
    </div>
  );
}

