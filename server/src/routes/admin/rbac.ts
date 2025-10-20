/**
 * Admin RBAC Routes
 * Routes for managing roles, authorities, and user permissions
 */

import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import RBACModel from '../../models/rbac';
import UserModel from '../../models/user';
import { requireAuthority } from '../../middleware/auth';
import { adminRateLimiter } from '../../middleware/rateLimiter';
import { validate } from '../../middleware/validation';
import Joi from 'joi';

// Validation schemas
const assignRoleSchema = Joi.object({
  roleId: Joi.number().integer().positive().required()
});

const createRoleSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(255).optional(),
  authorityIds: Joi.array().items(Joi.number().integer().positive()).optional()
});

const createAuthoritySchema = Joi.object({
  resource: Joi.string().min(2).max(50).required(),
  action: Joi.string().min(2).max(50).required(),
  description: Joi.string().max(255).optional()
});

export const createAdminRBACRoutes = (pool: Pool): Router => {
  const router = Router();
  const rbacModel = new RBACModel(pool);
  const userModel = new UserModel();

  // Apply rate limiting to all admin routes
  router.use(adminRateLimiter);

  // ============================================================================
  // ROLES MANAGEMENT
  // ============================================================================

  /**
   * @route   GET /api/admin/rbac/roles
   * @desc    Get all roles with their authorities
   * @access  Admin with rbac:manage authority
   */
  router.get('/roles', requireAuthority('rbac:manage'), async (req: Request, res: Response) => {
    try {
      const roles = await rbacModel.getAllRoles();
      
      // Get authorities for each role
      const rolesWithAuthorities = await Promise.all(
        roles.map(async (role) => {
          const authorities = await rbacModel.getRoleAuthorities(role.id);
          return {
            ...role,
            authorities
          };
        })
      );

      res.json({
        success: true,
        data: rolesWithAuthorities
      });
    } catch (error) {
      console.error('Failed to get roles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve roles'
      });
    }
  });

  /**
   * @route   POST /api/admin/rbac/roles
   * @desc    Create a new role
   * @access  Admin with rbac:manage authority
   */
  router.post('/roles', requireAuthority('rbac:manage'), validate(createRoleSchema), async (req: Request, res: Response) => {
    try {
      const { name, description, authorityIds = [] } = req.body;
      
      const role = await rbacModel.createRole({
        name,
        description,
        authorityIds
      });

      res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully'
      });
    } catch (error: any) {
      console.error('Failed to create role:', error);
      if (error.code === '23505') { // Unique constraint violation
        res.status(400).json({
          success: false,
          error: 'Role name already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create role'
        });
      }
    }
  });

  // ============================================================================
  // AUTHORITIES MANAGEMENT
  // ============================================================================

  /**
   * @route   GET /api/admin/rbac/authorities
   * @desc    Get all authorities
   * @access  Admin with rbac:manage authority
   */
  router.get('/authorities', requireAuthority('rbac:manage'), async (req: Request, res: Response) => {
    try {
      const authorities = await rbacModel.getAllAuthorities();
      
      res.json({
        success: true,
        data: authorities
      });
    } catch (error) {
      console.error('Failed to get authorities:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve authorities'
      });
    }
  });

  /**
   * @route   POST /api/admin/rbac/authorities
   * @desc    Create a new authority
   * @access  Admin with rbac:manage authority
   */
  router.post('/authorities', requireAuthority('rbac:manage'), validate(createAuthoritySchema), async (req: Request, res: Response) => {
    try {
      const { resource, action, description } = req.body;
      
      const authority = await rbacModel.createAuthority({
        resource,
        action,
        description
      });

      res.status(201).json({
        success: true,
        data: authority,
        message: 'Authority created successfully'
      });
    } catch (error: any) {
      console.error('Failed to create authority:', error);
      if (error.code === '23505') { // Unique constraint violation
        res.status(400).json({
          success: false,
          error: 'Authority already exists'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create authority'
        });
      }
    }
  });

  // ============================================================================
  // USER ROLES MANAGEMENT
  // ============================================================================

  /**
   * @route   GET /api/admin/rbac/users
   * @desc    Get all users with their roles and authorities
   * @access  Admin with rbac:manage authority
   */
  router.get('/users', requireAuthority('rbac:manage'), async (req: Request, res: Response) => {
    try {
      const usersWithRoles = await rbacModel.getUsersWithRoles();
      
      res.json({
        success: true,
        data: usersWithRoles
      });
    } catch (error) {
      console.error('Failed to get users with roles:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve users'
      });
    }
  });

  /**
   * @route   POST /api/admin/rbac/users/:userId/roles
   * @desc    Assign role to user
   * @access  Admin with rbac:manage authority
   */
  router.post('/users/:userId/roles', requireAuthority('rbac:manage'), validate(assignRoleSchema), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const { roleId } = req.body;

      if (isNaN(userId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user ID'
        });
      }

      // Check if user exists
      const user = await userModel.getUserById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if role exists
      const role = await rbacModel.getRoleById(roleId);
      if (!role) {
        return res.status(404).json({
          success: false,
          error: 'Role not found'
        });
      }

      await rbacModel.assignRoleToUser(userId, roleId);

      res.json({
        success: true,
        message: 'Role assigned successfully'
      });
    } catch (error) {
      console.error('Failed to assign role to user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign role'
      });
    }
  });

  /**
   * @route   DELETE /api/admin/rbac/users/:userId/roles/:roleId
   * @desc    Remove role from user
   * @access  Admin with rbac:manage authority
   */
  router.delete('/users/:userId/roles/:roleId', requireAuthority('rbac:manage'), async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const roleId = parseInt(req.params.roleId);

      if (isNaN(userId) || isNaN(roleId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid user ID or role ID'
        });
      }

      await rbacModel.removeRoleFromUser(userId, roleId);

      res.json({
        success: true,
        message: 'Role removed successfully'
      });
    } catch (error) {
      console.error('Failed to remove role from user:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove role'
      });
    }
  });

  // ============================================================================
  // ROLE AUTHORITIES MANAGEMENT
  // ============================================================================

  /**
   * @route   POST /api/admin/rbac/roles/:roleId/authorities
   * @desc    Assign authority to role
   * @access  Admin with rbac:manage authority
   */
  router.post('/roles/:roleId/authorities', requireAuthority('rbac:manage'), async (req: Request, res: Response) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const { authorityId } = req.body;

      if (isNaN(roleId) || !authorityId) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role ID or authority ID'
        });
      }

      await rbacModel.assignAuthorityToRole(roleId, authorityId);

      res.json({
        success: true,
        message: 'Authority assigned to role successfully'
      });
    } catch (error) {
      console.error('Failed to assign authority to role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign authority to role'
      });
    }
  });

  /**
   * @route   DELETE /api/admin/rbac/roles/:roleId/authorities/:authorityId
   * @desc    Remove authority from role
   * @access  Admin with rbac:manage authority
   */
  router.delete('/roles/:roleId/authorities/:authorityId', requireAuthority('rbac:manage'), async (req: Request, res: Response) => {
    try {
      const roleId = parseInt(req.params.roleId);
      const authorityId = parseInt(req.params.authorityId);

      if (isNaN(roleId) || isNaN(authorityId)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid role ID or authority ID'
        });
      }

      await rbacModel.removeAuthorityFromRole(roleId, authorityId);

      res.json({
        success: true,
        message: 'Authority removed from role successfully'
      });
    } catch (error) {
      console.error('Failed to remove authority from role:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to remove authority from role'
      });
    }
  });

  return router;
};
