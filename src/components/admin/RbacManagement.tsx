import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Users, 
  Key, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X, 
  Loader2,
  UserPlus,
  UserMinus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import PermittedFor from '@/components/auth/PermittedFor';
import { rbacAPI, Role, Authority, UserWithRoles } from '@/services/api';

const RbacManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('roles');

  // Form states
  const [newRole, setNewRole] = useState({ name: '', description: '', authorityIds: [] as number[] });
  const [newAuthority, setNewAuthority] = useState({ resource: '', action: '', description: '' });
  const [selectedUser, setSelectedUser] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);

  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rolesData, authoritiesData, usersData] = await Promise.all([
        rbacAPI.getRoles(),
        rbacAPI.getAuthorities(),
        rbacAPI.getUsersWithRoles()
      ]);

      setRoles(rolesData.data || []);
      setAuthorities(authoritiesData.data || []);
      setUsers(usersData.data || []);
    } catch (error) {
      console.error('Failed to fetch RBAC data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load RBAC data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) {
      toast({
        title: 'Error',
        description: 'Role name is required',
        variant: 'destructive'
      });
      return;
    }

    try {
      await rbacAPI.createRole(newRole);
      toast({ title: 'Success', description: 'Role created successfully' });
      setNewRole({ name: '', description: '', authorityIds: [] });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create role',
        variant: 'destructive'
      });
    }
  };

  const handleCreateAuthority = async () => {
    if (!newAuthority.resource.trim() || !newAuthority.action.trim()) {
      toast({
        title: 'Error',
        description: 'Resource and action are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      await rbacAPI.createAuthority(newAuthority);
      toast({ title: 'Success', description: 'Authority created successfully' });
      setNewAuthority({ resource: '', action: '', description: '' });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create authority',
        variant: 'destructive'
      });
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast({
        title: 'Error',
        description: 'Please select both user and role',
        variant: 'destructive'
      });
      return;
    }

    try {
      await rbacAPI.assignRoleToUser(selectedUser, selectedRole);
      toast({ title: 'Success', description: 'Role assigned successfully' });
      setSelectedUser(null);
      setSelectedRole(null);
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign role',
        variant: 'destructive'
      });
    }
  };

  const handleRemoveRole = async (userId: number, roleId: number) => {
    try {
      await rbacAPI.removeRoleFromUser(userId, roleId);
      toast({ title: 'Success', description: 'Role removed successfully' });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to remove role',
        variant: 'destructive'
      });
    }
  };

  const toggleAuthorityForRole = async (roleId: number, authorityId: number, hasAuthority: boolean) => {
    try {
      if (hasAuthority) {
        await rbacAPI.removeAuthorityFromRole(roleId, authorityId);
      } else {
        await rbacAPI.assignAuthorityToRole(roleId, authorityId);
      }
      toast({ title: 'Success', description: 'Authority updated successfully' });
      fetchData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update authority',
        variant: 'destructive'
      });
    }
  };


  if (!isAuthenticated) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-muted-foreground">Please log in to access RBAC management.</p>
        </div>
      </div>
    );
  }


  if (loading && roles.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2">Role-Based Access Control</h2>
        <p className="text-muted-foreground">Manage roles, authorities, and user permissions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="authorities" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Authorities
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="assign" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Assign Roles
          </TabsTrigger>
        </TabsList>

        {/* Roles Tab */}
        <TabsContent value="roles" className="space-y-6">
          <PermittedFor authority="rbac:manage">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Role Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Role</CardTitle>
                <CardDescription>Define a new role with specific authorities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="role-name">Role Name</Label>
                  <Input
                    id="role-name"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    placeholder="e.g., manager, editor"
                  />
                </div>
                <div>
                  <Label htmlFor="role-description">Description</Label>
                  <Textarea
                    id="role-description"
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    placeholder="Describe the role's purpose"
                  />
                </div>
                <div>
                  <Label>Authorities</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded p-3">
                    {authorities.map((authority) => (
                      <div key={authority.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`authority-${authority.id}`}
                          checked={newRole.authorityIds.includes(authority.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setNewRole({ ...newRole, authorityIds: [...newRole.authorityIds, authority.id] });
                            } else {
                              setNewRole({ ...newRole, authorityIds: newRole.authorityIds.filter(id => id !== authority.id) });
                            }
                          }}
                        />
                                <Label htmlFor={`authority-${authority.id}`} className="text-sm flex items-center gap-2">
                                  <Badge variant="outline">{authority.resource}:{authority.action}</Badge>
                                  <span>{authority.description}</span>
                                </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={handleCreateRole} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Role
                </Button>
              </CardContent>
            </Card>

            {/* Existing Roles */}
            <Card>
              <CardHeader>
                <CardTitle>Existing Roles</CardTitle>
                <CardDescription>Manage role authorities</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {roles.map((role) => (
                    <div key={role.id} className="border rounded p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold">{role.name}</h4>
                          {role.description && <p className="text-sm text-muted-foreground">{role.description}</p>}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Authorities:</Label>
                        <div className="grid grid-cols-1 gap-1 max-h-32 overflow-y-auto">
                          {authorities.map((authority) => {
                            const hasAuthority = role.authorities?.some(ra => ra.id === authority.id) || false;
                            return (
                              <div key={authority.id} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={hasAuthority}
                                  onCheckedChange={() => toggleAuthorityForRole(role.id, authority.id, hasAuthority)}
                                />
                                <Label className="text-sm flex items-center gap-2">
                                  <Badge variant="outline">{authority.resource}:{authority.action}</Badge>
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          </PermittedFor>
          <PermittedFor authority="rbac:manage" fallback={
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Permission Required</h3>
              <p className="text-muted-foreground">You need 'rbac:manage' authority to access role management. Click "Seed RBAC Data" above to get started.</p>
            </div>
          }>
          </PermittedFor>
        </TabsContent>

        {/* Authorities Tab */}
        <TabsContent value="authorities" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Create Authority Form */}
            <Card>
              <CardHeader>
                <CardTitle>Create New Authority</CardTitle>
                <CardDescription>Define a new permission</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="authority-resource">Resource</Label>
                  <Input
                    id="authority-resource"
                    value={newAuthority.resource}
                    onChange={(e) => setNewAuthority({ ...newAuthority, resource: e.target.value })}
                    placeholder="e.g., products, orders"
                  />
                </div>
                <div>
                  <Label htmlFor="authority-action">Action</Label>
                  <Input
                    id="authority-action"
                    value={newAuthority.action}
                    onChange={(e) => setNewAuthority({ ...newAuthority, action: e.target.value })}
                    placeholder="e.g., view, create, edit, delete"
                  />
                </div>
                <div>
                  <Label htmlFor="authority-description">Description</Label>
                  <Textarea
                    id="authority-description"
                    value={newAuthority.description}
                    onChange={(e) => setNewAuthority({ ...newAuthority, description: e.target.value })}
                    placeholder="Describe what this permission allows"
                  />
                </div>
                <Button onClick={handleCreateAuthority} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Authority
                </Button>
              </CardContent>
            </Card>

            {/* Existing Authorities */}
            <Card>
              <CardHeader>
                <CardTitle>Existing Authorities</CardTitle>
                <CardDescription>All available permissions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {authorities.map((authority) => (
                    <div key={authority.id} className="border rounded p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant="outline">{authority.resource}:{authority.action}</Badge>
                          {authority.description && <p className="text-sm text-muted-foreground">{authority.description}</p>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Users & Their Roles</CardTitle>
              <CardDescription>View and manage user role assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.user_id} className="border rounded p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{user.first_name} {user.last_name}</h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div>
                        <Label className="text-sm font-medium">Roles:</Label>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {user.roles.map((role) => (
                            <div key={role.id} className="flex items-center space-x-1">
                              <Badge variant="secondary">{role.name}</Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveRole(user.user_id, role.id)}
                                className="h-4 w-4 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          {user.roles.length === 0 && (
                            <span className="text-sm text-muted-foreground">No roles assigned</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Authorities:</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {user.authorities.map((authority) => (
                            <Badge key={authority} variant="outline" className="text-xs">{authority}</Badge>
                          ))}
                          {user.authorities.length === 0 && (
                            <span className="text-sm text-muted-foreground">No authorities</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assign Roles Tab */}
        <TabsContent value="assign" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assign Role to User</CardTitle>
                  <CardDescription>Grant roles to users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="select-user">Select User</Label>
                  <Select value={selectedUser?.toString() || ''} onValueChange={(value) => setSelectedUser(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a user" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.user_id} value={user.user_id.toString()}>
                          {user.first_name} {user.last_name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="select-role">Select Role</Label>
                  <Select value={selectedRole?.toString() || ''} onValueChange={(value) => setSelectedRole(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name} - {role.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAssignRole} className="w-full">
                <UserPlus className="mr-2 h-4 w-4" />
                Assign Role
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RbacManagement;
