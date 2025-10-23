import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Shield, Loader2 } from 'lucide-react';
import { apiRequest } from '@/services/api';

const DebugAdminButton = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleGrantAdminRole = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to use this feature.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const data = await apiRequest<{
        success: boolean;
        data?: any;
        message?: string;
      }>('/api/admin/debug/grant-admin-role', {
        method: 'POST',
        credentials: 'include'
      });

      console.log('Debug: API Response received:', data);
      
      if (data.success) {
        console.log('Debug: Success! Granting admin role...');
        toast({
          title: 'Admin Role Granted!',
          description: 'You now have admin access. Check console for details.',
        });
        
        // Refresh user data to get updated role
        console.log('Debug: Refreshing user data...');
        await refreshUser();
        
        console.log('Debug: User data refreshed. No page reload needed.');
      } else {
        console.log('Debug: API returned error:', data);
        throw new Error(data.message || 'Failed to grant admin role');
      }
    } catch (error) {
      console.error('Error granting admin role:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to grant admin role',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Only show the button if user is logged in and not already admin
  if (!user || user.role === 'admin') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleGrantAdminRole}
        disabled={isLoading}
        className="bg-red-600 hover:bg-red-700 text-white shadow-lg"
        size="sm"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Granting Admin...
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 mr-2" />
            Debug: Grant Admin Role
          </>
        )}
      </Button>
    </div>
  );
};

export default DebugAdminButton;
