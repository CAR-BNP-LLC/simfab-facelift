#!/usr/bin/env node

/**
 * RBAC Seed Script
 * Populates the database with initial roles and authorities
 * Run with: npm run seed:rbac or node dist/scripts/seed-rbac.js
 */

import { Pool } from 'pg';
import RBACModel from '../models/rbac';
import UserModel from '../models/user';

// Database configuration
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'simfab_db',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const rbacModel = new RBACModel(pool);
const userModel = new UserModel();

async function seedRBAC() {
  console.log('🌱 Starting RBAC seed...');

  try {
    // Define authorities to create
    const authorities = [
      // Product authorities
      { resource: 'products', action: 'view', description: 'View products' },
      { resource: 'products', action: 'create', description: 'Create new products' },
      { resource: 'products', action: 'edit', description: 'Edit existing products' },
      { resource: 'products', action: 'delete', description: 'Delete products' },
      
      // Order authorities
      { resource: 'orders', action: 'view', description: 'View orders' },
      { resource: 'orders', action: 'manage', description: 'Manage order status and details' },
      
      // Dashboard authorities
      { resource: 'dashboard', action: 'view', description: 'View admin dashboard' },
      
      // RBAC management authorities
      { resource: 'rbac', action: 'manage', description: 'Manage roles and authorities' },
      
      // User management authorities
      { resource: 'users', action: 'view', description: 'View users' },
      { resource: 'users', action: 'manage', description: 'Manage user accounts' },
    ];

    console.log('📋 Creating authorities...');
    const createdAuthorities = [];
    
    for (const authData of authorities) {
      try {
        const authority = await rbacModel.createAuthority(authData);
        createdAuthorities.push(authority);
        console.log(`  ✅ Created authority: ${authData.resource}:${authData.action}`);
      } catch (error: any) {
        if (error.code === '23505') { // Unique constraint violation
          console.log(`  ⚠️  Authority ${authData.resource}:${authData.action} already exists`);
        } else {
          console.error(`  ❌ Failed to create authority ${authData.resource}:${authData.action}:`, error.message);
        }
      }
    }

    console.log('👥 Creating roles...');
    
    // Create admin role with all authorities
    const adminRole = await rbacModel.createRole({
      name: 'admin',
      description: 'Full administrative access',
      authorityIds: createdAuthorities.map(auth => auth.id)
    });
    console.log(`  ✅ Created admin role with ${createdAuthorities.length} authorities`);

    // Create staff role with limited authorities
    const staffAuthorities = createdAuthorities.filter(auth => 
      ['products:view', 'orders:view', 'orders:manage', 'dashboard:view'].includes(`${auth.resource}:${auth.action}`)
    );
    
    const staffRole = await rbacModel.createRole({
      name: 'staff',
      description: 'Staff access for order and product management',
      authorityIds: staffAuthorities.map(auth => auth.id)
    });
    console.log(`  ✅ Created staff role with ${staffAuthorities.length} authorities`);

    // Create customer role (no admin authorities)
    const customerRole = await rbacModel.createRole({
      name: 'customer',
      description: 'Standard customer access',
      authorityIds: [] // No admin authorities
    });
    console.log(`  ✅ Created customer role with no admin authorities`);

    // Assign admin role to first user if they exist
    console.log('🔗 Assigning roles to existing users...');
    try {
      const users = await userModel.getAllUsers();
      if (users.length > 0) {
        const firstUser = users[0];
        await rbacModel.assignRoleToUser(firstUser.id!, adminRole.id);
        console.log(`  ✅ Assigned admin role to user: ${firstUser.email}`);
      } else {
        console.log('  ℹ️  No existing users found to assign roles');
      }
    } catch (error) {
      console.error('  ❌ Failed to assign roles to users:', error);
    }

    console.log('🎉 RBAC seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Created ${createdAuthorities.length} authorities`);
    console.log(`  - Created 3 roles (admin, staff, customer)`);
    console.log('  - Assigned admin role to first user');
    
    console.log('\n🔑 Available Authorities:');
    authorities.forEach(auth => {
      console.log(`    - ${auth.resource}:${auth.action} (${auth.description})`);
    });

  } catch (error) {
    console.error('❌ RBAC seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the seed if this file is executed directly
if (require.main === module) {
  seedRBAC().catch(console.error);
}

export default seedRBAC;
