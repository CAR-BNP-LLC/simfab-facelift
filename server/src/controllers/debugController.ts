import { Request, Response } from 'express';
import { Pool } from 'pg';
import RBACModel from '../models/rbac';
import { successResponse, errorResponse } from '../utils/response';

export class DebugController {
  private rbacModel: RBACModel;

  constructor(private pool: Pool) {
    this.rbacModel = new RBACModel(pool);
  }

  /**
   * Grant admin role to current user (debug endpoint)
   */
  async grantAdminRole(req: Request, res: Response) {
    try {
      console.log('Debug: grantAdminRole called');
      console.log('Debug: Session data:', req.session);
      const userId = req.session?.userId;
      console.log('Debug: User ID:', userId);
      
      if (!userId) {
        console.log('Debug: No user ID found, returning 401');
        return res.status(401).json(errorResponse('User not authenticated'));
      }

      console.log('Debug: Checking user current role...');
      
      // Check if user already has admin role
      const existingUser = await this.pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      const hasAdminRole = existingUser.rows[0]?.role === 'admin';
      console.log(`Debug: User current role: ${existingUser.rows[0]?.role}`);
      
      if (hasAdminRole) {
        console.log('Debug: User already has admin role in users table, but checking RBAC authorities...');
      }

      console.log('Debug: Creating/updating RBAC structure...');
      
      // Create all authorities from seed-rbac.ts
      const authorities = [
        { resource: 'products', action: 'view', description: 'View products' },
        { resource: 'products', action: 'create', description: 'Create new products' },
        { resource: 'products', action: 'edit', description: 'Edit existing products' },
        { resource: 'products', action: 'delete', description: 'Delete products' },
        { resource: 'orders', action: 'view', description: 'View orders' },
        { resource: 'orders', action: 'manage', description: 'Manage order status and details' },
        { resource: 'dashboard', action: 'view', description: 'View admin dashboard' },
        { resource: 'rbac', action: 'manage', description: 'Manage roles and authorities' },
        { resource: 'users', action: 'view', description: 'View users' },
        { resource: 'users', action: 'manage', description: 'Manage user accounts' },
      ];

      const createdAuthorities = [];
      for (const authData of authorities) {
        try {
          const authority = await this.rbacModel.createAuthority(authData);
          createdAuthorities.push(authority);
          console.log(`Debug: Created authority: ${authData.resource}:${authData.action}`);
        } catch (error: any) {
          if (error.code === '23505') { // Duplicate key error
            console.log(`Debug: Authority ${authData.resource}:${authData.action} already exists`);
          } else {
            console.error(`Debug: Failed to create authority ${authData.resource}:${authData.action}:`, error.message);
          }
        }
      }

      // Get all authorities (including existing ones) for the admin role
      const allAuthorities = await this.pool.query('SELECT * FROM authorities');
      console.log(`Debug: Found ${allAuthorities.rows.length} total authorities`);

      // Create admin role with all authorities
      let adminRole;
      try {
        // Try to get existing admin role
        const existingRole = await this.pool.query('SELECT * FROM roles WHERE name = $1', ['admin']);
        if (existingRole.rows.length > 0) {
          adminRole = existingRole.rows[0];
          console.log('Debug: Admin role already exists');
        } else {
          console.log('Debug: Creating admin role...');
          const roleResult = await this.pool.query(
            'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
            ['admin', 'Full administrative access']
          );
          adminRole = roleResult.rows[0];
          console.log('Debug: Admin role created');
        }
      } catch (error) {
        console.error('Debug: Error with admin role:', error);
        throw error;
      }

      // Assign all authorities to admin role
      for (const authority of allAuthorities.rows) {
        try {
          await this.pool.query(
            'INSERT INTO role_authorities (role_id, authority_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [adminRole.id, authority.id]
          );
          console.log(`Debug: Assigned authority ${authority.resource}:${authority.action} to admin role`);
        } catch (error: any) {
          if (error.code !== '23505') { // Ignore duplicate key errors
            console.error(`Debug: Failed to assign authority ${authority.resource}:${authority.action}:`, error.message);
          }
        }
      }

      // Assign admin role to user
      try {
        await this.pool.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, adminRole.id]
        );
        console.log('Debug: Assigned admin role to user');
      } catch (error: any) {
        if (error.code !== '23505') { // Ignore duplicate key errors
          console.error('Debug: Failed to assign admin role to user:', error.message);
        } else {
          console.log('Debug: User already has admin role assigned');
        }
      }

      // Update user's role in users table
      const result = await this.pool.query(
        'UPDATE users SET role = $1 WHERE id = $2 RETURNING *',
        ['admin', userId]
      );

      console.log('Debug: Database update result:', result.rows);

      // Verify the user has authorities assigned
      const userAuthorities = await this.pool.query(`
        SELECT a.resource, a.action 
        FROM authorities a
        JOIN role_authorities ra ON a.id = ra.authority_id
        JOIN user_roles ur ON ra.role_id = ur.role_id
        WHERE ur.user_id = $1
      `, [userId]);

      console.log(`Debug: User has ${userAuthorities.rows.length} authorities assigned:`, userAuthorities.rows);

      console.log(`Debug: Granted admin role to user ${userId}`);

      const response = successResponse(
        {
          message: 'Admin role granted successfully',
          role: 'admin',
          userId: userId,
          authoritiesCount: userAuthorities.rows.length,
          authorities: userAuthorities.rows
        },
        'You now have admin access!'
      );

      console.log('Debug: Sending response:', response);
      res.json(response);

    } catch (error) {
      console.error('Error granting admin role:', error);
      res.status(500).json(errorResponse(
        'Failed to grant admin role',
        'DEBUG_ERROR'
      ));
    }
  }
}
