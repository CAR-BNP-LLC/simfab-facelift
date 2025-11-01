/**
 * Shipping Quotes Component
 * Admin component for managing shipping quotes for international orders
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Package, DollarSign, MapPin, Calendar, Mail, Truck, AlertCircle, CheckCircle, Edit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ShippingQuote {
  id: number;
  order_id: number | null;
  customer_email: string;
  customer_name: string;
  country: string;
  state: string | null;
  city: string | null;
  postal_code: string | null;
  package_size: 'S' | 'M' | 'L';
  fedex_list_rate: number | null;
  fedex_negotiated_rate: number | null;
  fedex_applied_rate: number | null;
  fedex_rate_discount_percent: number | null;
  fedex_service_type: string | null;
  status: 'pending' | 'quoted' | 'confirmed' | 'cancelled';
  quoted_amount: number | null;
  quoted_by: number | null;
  quoted_at: Date | null;
  quote_confirmation_number: string | null;
  notes: string | null;
  created_at: Date;
}

const ShippingQuotes = () => {
  const [quotes, setQuotes] = useState<ShippingQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedQuote, setSelectedQuote] = useState<ShippingQuote | null>(null);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    quotedAmount: '',
    quoteConfirmationNumber: '',
    notes: ''
  });
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchQuotes();
  }, [statusFilter]);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const url = `${API_URL}/api/admin/shipping-quotes?status=${statusFilter === 'all' ? '' : statusFilter}`;
      const response = await fetch(url, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setQuotes(data.data.quotes || []);
      } else {
        throw new Error(data.error?.message || 'Failed to fetch quotes');
      }
    } catch (error) {
      console.error('Failed to fetch shipping quotes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load shipping quotes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuote = (quote: ShippingQuote) => {
    setSelectedQuote(quote);
    setUpdateForm({
      quotedAmount: quote.fedex_applied_rate?.toString() || quote.fedex_list_rate?.toString() || '',
      quoteConfirmationNumber: quote.quote_confirmation_number || '',
      notes: quote.notes || ''
    });
    setUpdateDialogOpen(true);
  };

  const submitUpdate = async () => {
    if (!selectedQuote) return;

    if (!updateForm.quotedAmount || parseFloat(updateForm.quotedAmount) <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid quoted amount',
        variant: 'destructive'
      });
      return;
    }

    try {
      setUpdating(true);
      const response = await fetch(`${API_URL}/api/admin/shipping-quotes/${selectedQuote.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          quotedAmount: parseFloat(updateForm.quotedAmount),
          quoteConfirmationNumber: updateForm.quoteConfirmationNumber || undefined,
          notes: updateForm.notes || undefined
        })
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Shipping quote updated successfully'
        });
        setUpdateDialogOpen(false);
        fetchQuotes();
      } else {
        throw new Error(data.error?.message || 'Failed to update quote');
      }
    } catch (error) {
      console.error('Failed to update quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to update shipping quote',
        variant: 'destructive'
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      pending: 'outline',
      quoted: 'secondary',
      confirmed: 'default',
      cancelled: 'destructive'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipping Quotes
          </CardTitle>
          <CardDescription>
            Manage shipping quotes for international orders requiring manual rate confirmation
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 flex items-center gap-4">
            <Label htmlFor="status-filter">Filter by Status:</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchQuotes} variant="outline" size="sm">
              Refresh
            </Button>
          </div>

          {/* Quotes List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No shipping quotes found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {quotes.map((quote) => (
                <Card key={quote.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">Quote #{quote.id}</CardTitle>
                        {getStatusBadge(quote.status)}
                      </div>
                      {quote.status === 'pending' && (
                        <Button
                          onClick={() => handleUpdateQuote(quote)}
                          size="sm"
                          variant="outline"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Update Quote
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Customer:</span>
                          <span>{quote.customer_name}</span>
                          <span className="text-muted-foreground">({quote.customer_email})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Destination:</span>
                          <span>
                            {quote.city}, {quote.state} {quote.postal_code}, {quote.country}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Package Size:</span>
                          <Badge variant="outline">{quote.package_size}</Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">FedEx List Rate:</span>
                          <span>${quote.fedex_list_rate?.toFixed(2) || 'N/A'}</span>
                        </div>
                        {quote.fedex_negotiated_rate && (
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Negotiated Rate:</span>
                            <span className="text-green-600">
                              ${quote.fedex_negotiated_rate.toFixed(2)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Applied Rate:</span>
                          <span className="font-semibold">
                            ${quote.fedex_applied_rate?.toFixed(2) || 'N/A'}
                          </span>
                          {quote.fedex_rate_discount_percent && (
                            <Badge variant="secondary">
                              {quote.fedex_rate_discount_percent}% discount
                            </Badge>
                          )}
                        </div>
                        {quote.quoted_amount && (
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <span className="font-medium">Quoted Amount:</span>
                            <span className="font-semibold text-primary">
                              ${quote.quoted_amount.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {quote.quote_confirmation_number && (
                      <Alert className="mt-4">
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Confirmation Number:</strong> {quote.quote_confirmation_number}
                        </AlertDescription>
                      </Alert>
                    )}

                    {quote.notes && (
                      <div className="mt-4 p-3 bg-muted rounded-md">
                        <p className="text-sm font-medium mb-1">Notes:</p>
                        <p className="text-sm text-muted-foreground">{quote.notes}</p>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Created: {formatDate(quote.created_at)}
                        </div>
                        {quote.quoted_at && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Quoted: {formatDate(quote.quoted_at)}
                          </div>
                        )}
                      </div>
                      {quote.order_id && (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            // Could navigate to order details if needed
                            window.open(`/admin?tab=orders&order=${quote.order_id}`, '_blank');
                          }}
                        >
                          View Order #{quote.order_id}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Quote Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Shipping Quote</DialogTitle>
            <DialogDescription>
              Update the shipping quote with confirmed rate and confirmation number
            </DialogDescription>
          </DialogHeader>

          {selectedQuote && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted rounded-md text-sm">
                <p><strong>Customer:</strong> {selectedQuote.customer_name}</p>
                <p><strong>Destination:</strong> {selectedQuote.city}, {selectedQuote.country}</p>
                <p><strong>Package:</strong> {selectedQuote.package_size}</p>
                <p><strong>FedEx List Rate:</strong> ${selectedQuote.fedex_list_rate?.toFixed(2)}</p>
                {selectedQuote.fedex_negotiated_rate && (
                  <p><strong>Negotiated Rate:</strong> ${selectedQuote.fedex_negotiated_rate.toFixed(2)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="quotedAmount">
                  Quoted Amount <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="quotedAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={updateForm.quotedAmount}
                  onChange={(e) => setUpdateForm({ ...updateForm, quotedAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quoteConfirmationNumber">Quote Confirmation Number</Label>
                <Input
                  id="quoteConfirmationNumber"
                  value={updateForm.quoteConfirmationNumber}
                  onChange={(e) => setUpdateForm({ ...updateForm, quoteConfirmationNumber: e.target.value })}
                  placeholder="FedEx confirmation number (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                  placeholder="Additional notes (optional)"
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateDialogOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={submitUpdate} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Quote'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ShippingQuotes;

