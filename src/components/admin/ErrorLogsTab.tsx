/**
 * Error Logs Tab Component
 * Admin interface for viewing and managing server error logs
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, 
  AlertCircle, 
  Search, 
  Trash2, 
  Eye,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Calendar,
  BarChart3
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ErrorLog {
  id: number;
  request_id: string;
  status_code: number;
  error_code: string | null;
  error_name: string;
  error_message: string;
  error_stack: string | null;
  http_method: string;
  path: string;
  query_params: any;
  request_body: any;
  user_id: number | null;
  ip_address: string | null;
  user_agent: string | null;
  request_headers: any;
  error_details: any;
  created_at: string;
}

interface ErrorLogStats {
  total: number;
  recent: number;
  byStatusCode: Array<{ status_code: number; count: string }>;
  byErrorCode: Array<{ error_code: string; count: string }>;
  byPath: Array<{ path: string; count: string }>;
  timeSeries: Array<{ date: string; count: string }>;
  days: number;
}

export default function ErrorLogsTab() {
  const [logs, setLogs] = useState<ErrorLog[]>([]);
  const [stats, setStats] = useState<ErrorLogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit, setLimit] = useState(50);
  
  // Filters
  const [statusCode, setStatusCode] = useState<string>('');
  const [errorCode, setErrorCode] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [pathFilter, setPathFilter] = useState<string>('');

  const { toast } = useToast();

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [page, limit, statusCode, errorCode, search, pathFilter]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (statusCode) params.append('statusCode', statusCode);
      if (errorCode) params.append('errorCode', errorCode);
      if (search) params.append('search', search);
      if (pathFilter) params.append('path', pathFilter);

      const res = await fetch(`${API_URL}/api/admin/logs?${params}`, {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setLogs(data.data.data || []);
          setTotalPages(data.data.pagination?.totalPages || 1);
        }
      } else {
        throw new Error('Failed to fetch logs');
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch error logs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/logs/stats?days=7`, {
        credentials: 'include'
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setStats({
            total: data.data.total || 0,
            recent: data.data.recent || 0,
            byStatusCode: data.data.byStatusCode || [],
            byErrorCode: data.data.byErrorCode || [],
            byPath: data.data.byPath || [],
            timeSeries: data.data.timeSeries || [],
            days: data.data.days || 7
          });
        }
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this error log?')) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/logs/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Error log deleted successfully'
        });
        fetchLogs();
        fetchStats();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete error log',
        variant: 'destructive'
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadgeVariant = (statusCode: number) => {
    if (statusCode >= 500 && statusCode < 600) return 'destructive';
    return 'secondary';
  };

  const clearFilters = () => {
    setStatusCode('');
    setErrorCode('');
    setSearch('');
    setPathFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recent}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatsDialogOpen(true)}
                  className="w-full"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Stats
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filters</span>
            {(statusCode || errorCode || search || pathFilter) && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status Code</label>
              <Select value={statusCode || undefined} onValueChange={(value) => setStatusCode(value === 'all' ? '' : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="All status codes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="500">500 - Internal Server Error</SelectItem>
                  <SelectItem value="501">501 - Not Implemented</SelectItem>
                  <SelectItem value="502">502 - Bad Gateway</SelectItem>
                  <SelectItem value="503">503 - Service Unavailable</SelectItem>
                  <SelectItem value="504">504 - Gateway Timeout</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Error Code</label>
              <Input
                placeholder="Filter by error code"
                value={errorCode}
                onChange={(e) => setErrorCode(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Path</label>
              <Input
                placeholder="Filter by path"
                value={pathFilter}
                onChange={(e) => setPathFilter(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search errors..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Error Logs</CardTitle>
              <CardDescription>Server error logs (5xx only)</CardDescription>
            </div>
            <Select value={limit.toString()} onValueChange={(v) => { setLimit(parseInt(v)); setPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25 per page</SelectItem>
                <SelectItem value="50">50 per page</SelectItem>
                <SelectItem value="100">100 per page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No error logs found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Time</th>
                      <th className="text-left p-2">Status</th>
                      <th className="text-left p-2">Error</th>
                      <th className="text-left p-2">Method</th>
                      <th className="text-left p-2">Path</th>
                      <th className="text-left p-2">User</th>
                      <th className="text-left p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 text-sm">{formatDate(log.created_at)}</td>
                        <td className="p-2">
                          <Badge variant={getStatusBadgeVariant(log.status_code)}>
                            {log.status_code}
                          </Badge>
                        </td>
                        <td className="p-2">
                          <div className="max-w-xs truncate" title={log.error_message}>
                            <div className="text-sm font-medium">{log.error_name}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {log.error_message}
                            </div>
                          </div>
                        </td>
                        <td className="p-2 text-sm">{log.http_method}</td>
                        <td className="p-2 text-sm font-mono text-xs max-w-xs truncate" title={log.path}>
                          {log.path}
                        </td>
                        <td className="p-2 text-sm">
                          {log.user_id ? `User #${log.user_id}` : 'Guest'}
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedLog(log);
                                setDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(log.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages || loading}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Error Log Details</DialogTitle>
            <DialogDescription>
              Request ID: {selectedLog?.request_id}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Status Code</label>
                  <div>
                    <Badge variant={getStatusBadgeVariant(selectedLog.status_code)}>
                      {selectedLog.status_code}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Error Code</label>
                  <div className="text-sm">{selectedLog.error_code || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">HTTP Method</label>
                  <div className="text-sm">{selectedLog.http_method}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Path</label>
                  <div className="text-sm font-mono">{selectedLog.path}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">User ID</label>
                  <div className="text-sm">{selectedLog.user_id || 'Guest'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">IP Address</label>
                  <div className="text-sm">{selectedLog.ip_address || 'N/A'}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Timestamp</label>
                  <div className="text-sm">{formatDate(selectedLog.created_at)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">User Agent</label>
                  <div className="text-sm text-xs truncate" title={selectedLog.user_agent || ''}>
                    {selectedLog.user_agent || 'N/A'}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Error Name</label>
                <div className="text-sm font-medium">{selectedLog.error_name}</div>
              </div>

              <div>
                <label className="text-sm font-medium">Error Message</label>
                <div className="text-sm bg-muted p-2 rounded">{selectedLog.error_message}</div>
              </div>

              {selectedLog.error_stack && (
                <div>
                  <label className="text-sm font-medium">Stack Trace</label>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {selectedLog.error_stack}
                  </pre>
                </div>
              )}

              {selectedLog.query_params && (
                <div>
                  <label className="text-sm font-medium">Query Parameters</label>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.query_params, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.request_body && (
                <div>
                  <label className="text-sm font-medium">Request Body</label>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.request_body, null, 2)}
                  </pre>
                </div>
              )}

              {selectedLog.error_details && (
                <div>
                  <label className="text-sm font-medium">Error Details</label>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(selectedLog.error_details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={statsDialogOpen} onOpenChange={setStatsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Error Statistics</DialogTitle>
            <DialogDescription>
              Statistics for the last {stats?.days || 7} days
            </DialogDescription>
          </DialogHeader>
          {stats && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Total Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.total}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Recent (7 days)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.recent}</div>
                  </CardContent>
                </Card>
              </div>

              {stats.byErrorCode && stats.byErrorCode.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Top Error Codes</h4>
                  <div className="space-y-2">
                    {stats.byErrorCode.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>{item.error_code}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {stats.byPath && stats.byPath.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Top Error Paths</h4>
                  <div className="space-y-2">
                    {stats.byPath.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="font-mono text-xs truncate">{item.path}</span>
                        <span className="font-medium">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

