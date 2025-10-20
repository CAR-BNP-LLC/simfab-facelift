import { Pool } from 'pg';

// TypeScript interfaces for RBAC
export interface Role {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Authority {
  id: number;
  description?: string;
  resource: string;
  action: string;
  created_at: string;
}

// Helper function to generate authority name from resource and action
export const getAuthorityName = (resource: string, action: string): string => {
  return `${resource}:${action}`;
};

export interface UserRole {
  id: number;
  user_id: number;
  role_id: number;
  created_at: string;
}

export interface RoleAuthority {
  id: number;
  role_id: number;
  authority_id: number;
  created_at: string;
}

export interface CreateRoleData {
  name: string;
  description?: string;
  authorityIds?: number[];
}

export interface CreateAuthorityData {
  description?: string;
  resource: string;
  action: string;
}

class RBACModel {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Role methods
  async createRole(data: CreateRoleData): Promise<Role> {
    const { name, description, authorityIds = [] } = data;
    
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create the role
      const roleResult = await client.query(
        'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING *',
        [name, description]
      );
      
      const role = roleResult.rows[0];
      
      // Assign authorities to the role
      if (authorityIds.length > 0) {
        const values = authorityIds.map((authorityId, index) => 
          `($${index * 2 + 3}, $${index * 2 + 4})`
        ).join(', ');
        
        const params = [role.id, new Date(), ...authorityIds.flatMap(id => [id, new Date()])];
        
        await client.query(
          `INSERT INTO role_authorities (role_id, authority_id, created_at) VALUES ${values}`,
          params
        );
      }
      
      await client.query('COMMIT');
      return role;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAllRoles(): Promise<Role[]> {
    const result = await this.pool.query('SELECT * FROM roles ORDER BY name');
    return result.rows;
  }

  async getRoleById(id: number): Promise<Role | null> {
    const result = await this.pool.query('SELECT * FROM roles WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getRoleByName(name: string): Promise<Role | null> {
    const result = await this.pool.query('SELECT * FROM roles WHERE name = $1', [name]);
    return result.rows[0] || null;
  }

  // Authority methods
  async createAuthority(data: CreateAuthorityData): Promise<Authority> {
    const { description, resource, action } = data;
    const result = await this.pool.query(
      'INSERT INTO authorities (description, resource, action) VALUES ($1, $2, $3) RETURNING *',
      [description, resource, action]
    );
    return result.rows[0];
  }

  async getAllAuthorities(): Promise<Authority[]> {
    const result = await this.pool.query('SELECT * FROM authorities ORDER BY resource, action');
    return result.rows;
  }

  async getAuthorityById(id: number): Promise<Authority | null> {
    const result = await this.pool.query('SELECT * FROM authorities WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  async getAuthorityByName(name: string): Promise<Authority | null> {
    const [resource, action] = name.split(':');
    const result = await this.pool.query('SELECT * FROM authorities WHERE resource = $1 AND action = $2', [resource, action]);
    return result.rows[0] || null;
  }

  // User-Role relationship methods
  async assignRoleToUser(userId: number, roleId: number): Promise<void> {
    await this.pool.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING',
      [userId, roleId]
    );
  }

  async removeRoleFromUser(userId: number, roleId: number): Promise<void> {
    await this.pool.query(
      'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );
  }

  async getUserRoles(userId: number): Promise<Role[]> {
    const result = await this.pool.query(`
      SELECT r.* FROM roles r
      INNER JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY r.name
    `, [userId]);
    return result.rows;
  }

  // User authorities methods
  async getUserAuthorities(userId: number): Promise<string[]> {
    const result = await this.pool.query(`
      SELECT DISTINCT a.resource, a.action FROM authorities a
      INNER JOIN role_authorities ra ON a.id = ra.authority_id
      INNER JOIN user_roles ur ON ra.role_id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY a.resource, a.action
    `, [userId]);
    return result.rows.map(row => getAuthorityName(row.resource, row.action));
  }

  async getUserAuthoritiesDetailed(userId: number): Promise<Authority[]> {
    const result = await this.pool.query(`
      SELECT DISTINCT a.* FROM authorities a
      INNER JOIN role_authorities ra ON a.id = ra.authority_id
      INNER JOIN user_roles ur ON ra.role_id = ur.role_id
      WHERE ur.user_id = $1
      ORDER BY a.resource, a.action
    `, [userId]);
    return result.rows;
  }

  // Role-Authority relationship methods
  async assignAuthorityToRole(roleId: number, authorityId: number): Promise<void> {
    await this.pool.query(
      'INSERT INTO role_authorities (role_id, authority_id) VALUES ($1, $2) ON CONFLICT (role_id, authority_id) DO NOTHING',
      [roleId, authorityId]
    );
  }

  async removeAuthorityFromRole(roleId: number, authorityId: number): Promise<void> {
    await this.pool.query(
      'DELETE FROM role_authorities WHERE role_id = $1 AND authority_id = $2',
      [roleId, authorityId]
    );
  }

  async getRoleAuthorities(roleId: number): Promise<Authority[]> {
    const result = await this.pool.query(`
      SELECT a.* FROM authorities a
      INNER JOIN role_authorities ra ON a.id = ra.authority_id
      WHERE ra.role_id = $1
      ORDER BY a.resource, a.action
    `, [roleId]);
    return result.rows;
  }

  // Utility methods
  async hasUserAuthority(userId: number, authority: string): Promise<boolean> {
    const [resource, action] = authority.split(':');
    const result = await this.pool.query(`
      SELECT 1 FROM authorities a
      INNER JOIN role_authorities ra ON a.id = ra.authority_id
      INNER JOIN user_roles ur ON ra.role_id = ur.role_id
      WHERE ur.user_id = $1 AND a.resource = $2 AND a.action = $3
      LIMIT 1
    `, [userId, resource, action]);
    return result.rows.length > 0;
  }

  async hasUserAnyAuthority(userId: number, authorities: string[]): Promise<boolean> {
    if (authorities.length === 0) return true;
    
    // Convert authority names to resource/action pairs
    const authorityPairs = authorities.map(auth => {
      const [resource, action] = auth.split(':');
      return { resource, action };
    });
    
    const conditions = authorityPairs.map((_, index) => 
      `(a.resource = $${index * 2 + 2} AND a.action = $${index * 2 + 3})`
    ).join(' OR ');
    
    const params = [userId, ...authorityPairs.flatMap(pair => [pair.resource, pair.action])];
    
    const result = await this.pool.query(`
      SELECT 1 FROM authorities a
      INNER JOIN role_authorities ra ON a.id = ra.authority_id
      INNER JOIN user_roles ur ON ra.role_id = ur.role_id
      WHERE ur.user_id = $1 AND (${conditions})
      LIMIT 1
    `, params);
    return result.rows.length > 0;
  }

  async hasUserAllAuthorities(userId: number, authorities: string[]): Promise<boolean> {
    if (authorities.length === 0) return true;
    
    // Convert authority names to resource/action pairs
    const authorityPairs = authorities.map(auth => {
      const [resource, action] = auth.split(':');
      return { resource, action };
    });
    
    const conditions = authorityPairs.map((_, index) => 
      `(a.resource = $${index * 2 + 2} AND a.action = $${index * 2 + 3})`
    ).join(' OR ');
    
    const params = [userId, ...authorityPairs.flatMap(pair => [pair.resource, pair.action])];
    
    const result = await this.pool.query(`
      SELECT COUNT(DISTINCT CONCAT(a.resource, ':', a.action)) as count FROM authorities a
      INNER JOIN role_authorities ra ON a.id = ra.authority_id
      INNER JOIN user_roles ur ON ra.role_id = ur.role_id
      WHERE ur.user_id = $1 AND (${conditions})
    `, params);
    
    return parseInt(result.rows[0].count) === authorities.length;
  }

  // Get all users with their roles and authorities (for admin management)
  async getUsersWithRoles(): Promise<Array<{
    user_id: number;
    email: string;
    first_name: string;
    last_name: string;
    roles: Role[];
    authorities: string[];
  }>> {
    const result = await this.pool.query(`
      SELECT 
        u.id as user_id,
        u.email,
        u.first_name,
        u.last_name,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', r.id,
              'name', r.name,
              'description', r.description
            )
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) as roles,
        COALESCE(
          array_agg(DISTINCT CONCAT(a.resource, ':', a.action)) FILTER (WHERE a.resource IS NOT NULL),
          '{}'
        ) as authorities
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LEFT JOIN role_authorities ra ON r.id = ra.role_id
      LEFT JOIN authorities a ON ra.authority_id = a.id
      GROUP BY u.id, u.email, u.first_name, u.last_name
      ORDER BY u.email
    `);
    
    return result.rows.map(row => ({
      user_id: row.user_id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      roles: row.roles,
      authorities: row.authorities
    }));
  }

  // Clean up methods for testing/development
  async clearAllUserRoles(): Promise<void> {
    await this.pool.query('DELETE FROM user_roles');
  }

  async clearAllRoleAuthorities(): Promise<void> {
    await this.pool.query('DELETE FROM role_authorities');
  }

  async clearAllAuthorities(): Promise<void> {
    await this.pool.query('DELETE FROM authorities');
  }

  async clearAllRoles(): Promise<void> {
    await this.pool.query('DELETE FROM roles');
  }
}

export default RBACModel;
