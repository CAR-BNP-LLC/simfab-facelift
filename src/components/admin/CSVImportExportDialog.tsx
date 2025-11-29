/**
 * CSV Import/Export Dialog
 * Handles CSV import and export for products
 */

import { useState, useRef } from 'react';
import {
  Upload,
  Download,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { productsAPI, ImportResult } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';

interface CSVImportExportDialogProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

const CSVImportExportDialog = ({
  open,
  onClose,
  onImportComplete
}: CSVImportExportDialogProps) => {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [file, setFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'create' | 'update' | 'skip_duplicates'>('create');
  const [importing, setImporting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [exportStatusMsg, setExportStatusMsg] = useState('');
  const [exportFilters, setExportFilters] = useState({
    status: 'all',
    category: '',
    region: 'all' as 'us' | 'eu' | 'all'
  });
  const [importAsGroups, setImportAsGroups] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.csv')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a CSV file',
          variant: 'destructive'
        });
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
    }
  };

  const handleValidate = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a CSV file to validate',
        variant: 'destructive'
      });
      return;
    }

    setValidating(true);
    setImportResult(null);

    try {
      const response = await productsAPI.validateCSV(file);
      setImportResult(response.data);
      if (response.data.errors.length > 0) {
        toast({
          title: 'Validation found errors',
          description: `Found ${response.data.errors.length} error(s) in ${response.data.total} rows`,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Validation successful',
          description: `CSV file is valid. ${response.data.total} rows validated.`
        });
      }
    } catch (error: any) {
      toast({
        title: 'Validation failed',
        description: error.message || 'Failed to validate CSV file',
        variant: 'destructive'
      });
    } finally {
      setValidating(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a CSV file to import',
        variant: 'destructive'
      });
      return;
    }

    setImporting(true);
    setImportResult(null);

    try {
      const response = await productsAPI.importCSV(file, importMode, false, importAsGroups);
      setImportResult(response.data);

      if (response.data.success) {
        toast({
          title: 'Import successful',
          description: `Imported ${response.data.created + response.data.updated} products. ${response.data.skipped} skipped.`
        });
        if (onImportComplete) {
          onImportComplete();
        }
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        toast({
          title: 'Import completed with errors',
          description: `Import completed but ${response.data.errors.length} errors occurred`,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Import failed',
        description: error.message || 'Failed to import CSV file',
        variant: 'destructive'
      });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setExportStatus('idle');
    setExportStatusMsg('');

    try {
      const options: any = {};
      if (exportFilters.status && exportFilters.status !== 'all') options.status = exportFilters.status;
      if (exportFilters.category) options.category = exportFilters.category;
      if (exportFilters.region && exportFilters.region !== 'all') options.region = exportFilters.region;

      await productsAPI.exportCSV(Object.keys(options).length > 0 ? options : undefined);
      
      setExportStatus('success');
      setExportStatusMsg('Products exported successfully. Download started.');
      toast({
        title: 'Export successful',
        description: 'CSV file download started'
      });
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error: any) {
      setExportStatus('error');
      setExportStatusMsg(error.message || 'Failed to export products');
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export products',
        variant: 'destructive'
      });
    } finally {
      setExporting(false);
    }
  };

  const resetImport = () => {
    setFile(null);
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSV Import / Export</DialogTitle>
          <DialogDescription>
            Import products from CSV or export existing products to CSV
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'import' | 'export')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          {/* Import Tab */}
          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Import Products from CSV</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">Select CSV File</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      ref={fileInputRef}
                      className="flex-1"
                    />
                    {file && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={resetImport}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {file && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span>{file.name} ({(file.size / 1024).toFixed(2)} KB)</span>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Import Mode</Label>
                  <Select value={importMode} onValueChange={(v: any) => setImportMode(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create">Create New (Skip Duplicates)</SelectItem>
                      <SelectItem value="update">Update Existing</SelectItem>
                      <SelectItem value="skip_duplicates">Skip Duplicates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="import-as-groups"
                      checked={importAsGroups}
                      onCheckedChange={(checked) => setImportAsGroups(!!checked)}
                    />
                    <Label htmlFor="import-as-groups" className="text-sm leading-none">
                      Import products as groups
                    </Label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Assigns a group ID (`product_group_id`) for each product to enable safe
                    cross-region pairing. Variations and add-ons remain unchanged.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleValidate}
                    disabled={!file || validating || importing}
                    className="flex-1"
                  >
                    {validating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Info className="mr-2 h-4 w-4" />
                    )}
                    Validate
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={!file || importing || validating}
                    className="flex-1"
                  >
                    {importing ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Import Products
                  </Button>
                </div>

                {importResult && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-lg">Import Results</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Total</div>
                          <div className="text-2xl font-bold">{importResult.total}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Created</div>
                          <div className="text-2xl font-bold text-green-600">{importResult.created}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Updated</div>
                          <div className="text-2xl font-bold text-blue-600">{importResult.updated}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Skipped</div>
                          <div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div>
                        </div>
                      </div>

                      {importResult.errors.length > 0 && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-semibold mb-2">
                              {importResult.errors.length} Error(s) Found:
                            </div>
                            <div className="max-h-60 overflow-y-auto space-y-1 text-sm">
                              {importResult.errors.slice(0, 20).map((error, idx) => (
                                <div key={idx} className="border-l-2 border-destructive pl-2">
                                  <div className="font-medium">
                                    Row {error.row} {error.sku && `(SKU: ${error.sku})`}
                                  </div>
                                  <div className="text-muted-foreground">
                                    {error.field && `${error.field}: `}{error.message}
                                  </div>
                                </div>
                              ))}
                              {importResult.errors.length > 20 && (
                                <div className="text-muted-foreground italic">
                                  ... and {importResult.errors.length - 20} more errors
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {importResult.warnings.length > 0 && (
                        <Alert>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="font-semibold mb-2">
                              {importResult.warnings.length} Warning(s):
                            </div>
                            <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                              {importResult.warnings.slice(0, 10).map((warning, idx) => (
                                <div key={idx}>
                                  Row {warning.row} {warning.sku && `(SKU: ${warning.sku})`}: {warning.message}
                                </div>
                              ))}
                              {importResult.warnings.length > 10 && (
                                <div className="text-muted-foreground italic">
                                  ... and {importResult.warnings.length - 10} more warnings
                                </div>
                              )}
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Export Products to CSV</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Status Filter</Label>
                  <Select
                    value={exportFilters.status}
                    onValueChange={(v) => setExportFilters({ ...exportFilters, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Category Filter</Label>
                  <Input
                    placeholder="Enter category name (optional)"
                    value={exportFilters.category}
                    onChange={(e) => setExportFilters({ ...exportFilters, category: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Region Filter</Label>
                  <Select
                    value={exportFilters.region}
                    onValueChange={(v: any) => setExportFilters({ ...exportFilters, region: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All regions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Regions</SelectItem>
                      <SelectItem value="us">US</SelectItem>
                      <SelectItem value="eu">EU</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full"
                >
                  {exporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Export Products
                    </>
                  )}
                </Button>

                {exportStatus === 'success' && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{exportStatusMsg}</AlertDescription>
                  </Alert>
                )}

                {exportStatus === 'error' && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{exportStatusMsg}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CSVImportExportDialog;

