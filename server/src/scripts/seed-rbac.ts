#!/usr/bin/env node

/**
 * RBAC Seed Script
 * Populates the database with initial roles and authorities
 * Run with: npm run seed:rbac or node dist/scripts/seed-rbac.js
 */

import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import RBACModel from '../models/rbac';
import UserModel from '../models/user';

import { getSSLConfig } from '../config/database';

// Database configuration
// Use DATABASE_URL for Docker/production, or individual params for local development
const connectionString = process.env.DATABASE_URL;
const pool = new Pool(
  connectionString
    ? {
        connectionString,
        ssl: getSSLConfig(connectionString),
        connectionTimeoutMillis: 30000, // 30 seconds timeout for resource-constrained environments
      }
    : {
        user: process.env.DB_USER || 'postgres',
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'simfab_dev',
        password: process.env.DB_PASSWORD || 'postgres',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: false, // Individual params are always local
        connectionTimeoutMillis: 30000, // 30 seconds timeout for resource-constrained environments
      }
);

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
      
      // Email management authorities
      { resource: 'emails', action: 'view', description: 'View email templates and logs' },
      { resource: 'emails', action: 'manage', description: 'Create, edit, and manage email templates' },
      
      // Coupon authorities
      { resource: 'coupons', action: 'view', description: 'View coupons' },
      { resource: 'coupons', action: 'create', description: 'Create new coupons' },
      { resource: 'coupons', action: 'edit', description: 'Edit existing coupons' },
      { resource: 'coupons', action: 'delete', description: 'Delete coupons' },
      
      // Marketing campaign authorities
      { resource: 'marketing', action: 'view', description: 'View marketing campaigns' },
      { resource: 'marketing', action: 'create', description: 'Create new marketing campaigns' },
      { resource: 'marketing', action: 'edit', description: 'Edit existing marketing campaigns' },
      { resource: 'marketing', action: 'send', description: 'Send marketing campaigns' },
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

    // Get all authorities (including any that already existed)
    const allAuthorities = await rbacModel.getAllAuthorities();
    console.log(`  📊 Found ${allAuthorities.length} total authorities`);

    console.log('👥 Creating roles...');
    
    // Get or create admin role with all authorities
    let adminRole = await rbacModel.getRoleByName('admin');
    if (!adminRole) {
      adminRole = await rbacModel.createRole({
        name: 'admin',
        description: 'Full administrative access',
        authorityIds: allAuthorities.map(auth => auth.id)
      });
      console.log(`  ✅ Created admin role with ${allAuthorities.length} authorities`);
    } else {
      console.log(`  ⚠️  Admin role already exists (ID: ${adminRole.id})`);
    }

    // Create staff role with limited authorities
    const staffAuthorities = allAuthorities.filter(auth => 
      ['products:view', 'orders:view', 'orders:manage', 'dashboard:view', 'emails:view'].includes(`${auth.resource}:${auth.action}`)
    );
    
    let staffRole = await rbacModel.getRoleByName('staff');
    if (!staffRole) {
      staffRole = await rbacModel.createRole({
        name: 'staff',
        description: 'Staff access for order and product management',
        authorityIds: staffAuthorities.map(auth => auth.id)
      });
      console.log(`  ✅ Created staff role with ${staffAuthorities.length} authorities`);
    } else {
      console.log(`  ⚠️  Staff role already exists`);
    }

    // Create customer role (no admin authorities)
    let customerRole = await rbacModel.getRoleByName('customer');
    if (!customerRole) {
      customerRole = await rbacModel.createRole({
        name: 'customer',
        description: 'Standard customer access',
        authorityIds: [] // No admin authorities
      });
      console.log(`  ✅ Created customer role with no admin authorities`);
    } else {
      console.log(`  ⚠️  Customer role already exists`);
    }

    // Create admin users if they don't exist
    console.log('👤 Creating admin users...');
    const adminPassword = 'SimFabSimFab#@2025';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
    
    const adminUsers = [
      { email: 'info@simfab.com', firstName: 'Info', lastName: 'SimFab' },
      { email: 'd@simfab.com', firstName: 'D', lastName: 'SimFab' },
      { email: 'd.vasilev@simfab.com', firstName: 'D', lastName: 'Vasilev' },
      { email: 'SimFabSimFab#@2025', firstName: 'SimFab', lastName: 'Admin' },
    ];
    
    const createdUsers = [];
    for (const userData of adminUsers) {
      try {
        let user = await userModel.getUserByEmail(userData.email);
        
        if (!user) {
          // Create user if it doesn't exist
          user = await userModel.createUser({
            email: userData.email,
            password: hashedPassword,
            first_name: userData.firstName,
            last_name: userData.lastName,
          });
          console.log(`  ✅ Created user: ${userData.email}`);
          createdUsers.push(user);
        } else {
          console.log(`  ⚠️  User ${userData.email} already exists`);
          createdUsers.push(user);
        }
      } catch (error: any) {
        console.error(`  ❌ Failed to create user ${userData.email}:`, error.message);
      }
    }

    // Assign admin role to users
    console.log('🔗 Assigning admin role to users...');
    const usersToAssign = [
      'svetoslav2806@gmail.com',
      ...adminUsers.map(u => u.email),
    ];
    
    for (const targetEmail of usersToAssign) {
      try {
        const user = await userModel.getUserByEmail(targetEmail);
        
        if (user && user.id) {
          // Check if role is already assigned
          const userRoles = await rbacModel.getUserRoles(user.id);
          const hasAdminRole = userRoles.some(role => role.name === 'admin');
          
          if (!hasAdminRole) {
            await rbacModel.assignRoleToUser(user.id, adminRole.id);
            console.log(`  ✅ Assigned admin role to user: ${user.email}`);
          } else {
            console.log(`  ⚠️  User ${user.email} already has admin role`);
          }
        } else {
          console.log(`  ⚠️  User with email ${targetEmail} not found`);
        }
      } catch (error: any) {
        console.error(`  ❌ Failed to assign admin role to ${targetEmail}:`, error.message);
      }
    }

    console.log('🎉 RBAC seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Created ${createdAuthorities.length} authorities`);
    console.log(`  - Created 3 roles (admin, staff, customer)`);
    console.log(`  - Created/verified ${createdUsers.length} admin users`);
    console.log(`  - Assigned admin role to ${usersToAssign.length} users`);
    
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
