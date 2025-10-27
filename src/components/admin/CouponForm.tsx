import { useState, useEffect } from 'react';
import { X, Loader2, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Coupon {
  id?: number;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  description?: string;
  minimum_order_amount?: number;
  maximum_discount_amount?: number;
  usage_limit?: number;
  per_user_limit?: number;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
}

interface CouponFormProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  coupon?: Coupon | null;
}

export default function CouponForm({ open, onClose, onSave, coupon }: CouponFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const [formData, setFormData] = useState<Partial<Coupon>>({
    code: '',
    type: 'percentage',
    value: 0,
    description: '',
    minimum_order_amount: undefined,
    maximum_discount_amount: undefined,
    usage_limit: undefined,
    per_user_limit: 1,
    is_active: true,
  });

  useEffect(() => {
    if (coupon) {
      setFormData({
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description || '',
        minimum_order_amount: coupon.minimum_order_amount || undefined,
        maximum_discount_amount: coupon.maximum_discount_amount || undefined,
        usage_limit: coupon.usage_limit || undefined,
        per_user_limit: coupon.per_user_limit || 1,
        is_active: coupon.is_active !== undefined ? coupon.is_active : true,
      });
      setStartDate(coupon.start_date ? new Date(coupon.start_date) : undefined);
      setEndDate(coupon.end_date ? new Date(coupon.end_date) : undefined);
    } else {
      resetForm();
    }
  }, [coupon, open]);

  const resetForm = () => {
    setFormData({
      code: '',
      type: 'percentage',
      value: 0,
      description: '',
      minimum_order_amount: undefined,
      maximum_discount_amount: undefined,
      usage_limit: undefined,
      per_user_limit: 1,
      is_active: true,
    });
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        start_date: startDate ? startDate.toISOString() : null,
        end_date: endDate ? endDate.toISOString() : null,
      };

      const url = coupon?.id 
        ? `${API_URL}/api/admin/coupons/${coupon.id}`
        : `${API_URL}/api/admin/coupons`;
      
      const method = coupon?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Failed to save coupon');
      }

      toast({
        title: 'Success',
        description: coupon?.id ? 'Coupon updated successfully' : 'Coupon created successfully',
      });

      resetForm();
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving coupon:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save coupon',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {coupon ? 'Edit Coupon' : 'Create New Coupon'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Coupon Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
                className="font-mono"
              />
            </div>

            <div>
              <Label htmlFor="type">Discount Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value: 'percentage' | 'fixed' | 'free_shipping') =>
                  setFormData({ ...formData, type: value, value: value === 'free_shipping' ? 0 : formData.value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                  <SelectItem value="free_shipping">Free Shipping</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.type !== 'free_shipping' && (
            <div>
              <Label htmlFor="value">
                Discount Value *
                {formData.type === 'percentage' && ' (0-100)'}
              </Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                max={formData.type === 'percentage' ? '100' : undefined}
                value={formData.value || ''}
                onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                required
              />
            </div>
          )}

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
            />
          </div>

          {/* Restrictions */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="minimum_order">Minimum Order Amount</Label>
              <Input
                id="minimum_order"
                type="number"
                step="0.01"
                min="0"
                value={formData.minimum_order_amount || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  minimum_order_amount: e.target.value ? parseFloat(e.target.value) : undefined 
                })}
              />
            </div>

            {formData.type === 'percentage' && (
              <div>
                <Label htmlFor="max_discount">Maximum Discount Amount</Label>
                <Input
                  id="max_discount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.maximum_discount_amount || ''}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    maximum_discount_amount: e.target.value ? parseFloat(e.target.value) : undefined 
                  })}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="usage_limit">Total Usage Limit</Label>
              <Input
                id="usage_limit"
                type="number"
                min="0"
                value={formData.usage_limit || ''}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  usage_limit: e.target.value ? parseInt(e.target.value) : undefined 
                })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Total times this coupon can be used
              </p>
            </div>

            <div>
              <Label htmlFor="per_user_limit">Per User Limit</Label>
              <Input
                id="per_user_limit"
                type="number"
                min="1"
                value={formData.per_user_limit || 1}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  per_user_limit: parseInt(e.target.value) || 1 
                })}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Times each user can use this coupon
              </p>
            </div>
          </div>

          {/* Validity Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>End Date (Optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Select end date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
            />
            <Label htmlFor="is_active" className="cursor-pointer">
              Active
            </Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Coupon'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
