import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import PermittedFor from '@/components/auth/PermittedFor';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Coupon {
  id: number;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  description: string | null;
  minimum_order_amount: number | null;
  maximum_discount_amount: number | null;
  usage_limit: number | null;
  usage_count: number;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface CouponListProps {
  onCreateClick: () => void;
  onEditClick: (coupon: Coupon) => void;
  onDeleteClick: (coupon: Coupon) => void;
}

export default function CouponList({ onCreateClick, onEditClick, onDeleteClick }: CouponListProps) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchCoupons();
  }, [statusFilter]);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }

      const response = await fetch(`${API_URL}/api/admin/coupons?${params.toString()}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch coupons');

      const data = await response.json();
      // Normalize data - convert numeric strings to numbers
      const normalizedCoupons = (data.data.coupons || []).map((coupon: any) => ({
        ...coupon,
        value: typeof coupon.value === 'string' ? parseFloat(coupon.value) : coupon.value,
        minimum_order_amount: coupon.minimum_order_amount ? (typeof coupon.minimum_order_amount === 'string' ? parseFloat(coupon.minimum_order_amount) : coupon.minimum_order_amount) : null,
        maximum_discount_amount: coupon.maximum_discount_amount ? (typeof coupon.maximum_discount_amount === 'string' ? parseFloat(coupon.maximum_discount_amount) : coupon.maximum_discount_amount) : null,
        usage_count: coupon.usage_count ? parseInt(coupon.usage_count) : 0,
        usage_limit: coupon.usage_limit ? parseInt(coupon.usage_limit) : null,
      }));
      setCoupons(normalizedCoupons);
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast({
        title: 'Error',
        description: 'Failed to load coupons',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDiscount = (coupon: Coupon) => {
    if (coupon.type === 'percentage') {
      return `${coupon.value}% OFF`;
    } else if (coupon.type === 'fixed') {
      return `$${coupon.value.toFixed(2)} OFF`;
    } else {
      return 'FREE SHIPPING';
    }
  };

  const isExpired = (coupon: Coupon) => {
    if (!coupon.end_date) return false;
    return new Date(coupon.end_date) < new Date();
  };

  const isNotStarted = (coupon: Coupon) => {
    if (!coupon.start_date) return false;
    return new Date(coupon.start_date) > new Date();
  };

  const getStatusBadge = (coupon: Coupon) => {
    if (!coupon.is_active) {
      return <Badge variant="secondary">Inactive</Badge>;
    }
    if (isExpired(coupon)) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    if (isNotStarted(coupon)) {
      return <Badge variant="secondary">Scheduled</Badge>;
    }
    if (coupon.usage_limit && coupon.usage_count >= coupon.usage_limit) {
      return <Badge variant="destructive">Limit Reached</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Coupons</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage discount codes and promotional coupons
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Coupons</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <PermittedFor authority="coupons:create">
              <Button onClick={onCreateClick}>
                <Plus className="mr-2 h-4 w-4" />
                Create Coupon
              </Button>
            </PermittedFor>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No coupons found</p>
            <PermittedFor authority="coupons:create">
              <Button onClick={onCreateClick} variant="outline" className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create First Coupon
              </Button>
            </PermittedFor>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valid Period</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div>
                        <div className="font-mono font-semibold">{coupon.code}</div>
                        {coupon.description && (
                          <div className="text-sm text-muted-foreground">
                            {coupon.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold">{formatDiscount(coupon)}</div>
                      {coupon.minimum_order_amount && (
                        <div className="text-xs text-muted-foreground">
                          Min: ${coupon.minimum_order_amount.toFixed(2)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {coupon.usage_limit ? (
                        <div>
                          {coupon.usage_count} / {coupon.usage_limit}
                        </div>
                      ) : (
                        <div>{coupon.usage_count} uses</div>
                      )}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(coupon)}
                    </TableCell>
                    <TableCell>
                      {coupon.start_date && coupon.end_date ? (
                        <div className="text-sm">
                          <div>{new Date(coupon.start_date).toLocaleDateString()}</div>
                          <div className="text-muted-foreground">
                            to {new Date(coupon.end_date).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No expiry</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <PermittedFor authority="coupons:edit">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditClick(coupon)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </PermittedFor>
                        <PermittedFor authority="coupons:delete">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteClick(coupon)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </PermittedFor>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
