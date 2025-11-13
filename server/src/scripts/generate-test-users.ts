/**
 * Generate Test Users Script (DEV ONLY)
 * Generates 200 random test users with @devmail.fake email domain
 * 
 * WARNING: This script is for development only.
 * 
 * Usage: NODE_ENV=development ts-node src/scripts/generate-test-users.ts [count]
 * 
 * @param count - Number of users to generate (default: 200)
 */

import { Pool } from 'pg';
import { pool } from '../config/database';
import bcrypt from 'bcrypt';

// Safety check - only run in development
if (process.env.NODE_ENV === 'production') {
  console.error('❌ ERROR: This script can only be run in development mode!');
  console.error('Set NODE_ENV=development to run this script.');
  process.exit(1);
}

const FIRST_NAMES = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Nancy', 'Daniel', 'Lisa',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Dorothy', 'Kevin', 'Amy', 'Brian', 'Angela', 'George', 'Sharon',
  'Edward', 'Brenda', 'Ronald', 'Emma', 'Timothy', 'Olivia', 'Jason', 'Cynthia',
  'Jeffrey', 'Marie', 'Ryan', 'Janet', 'Jacob', 'Catherine', 'Gary', 'Frances',
  'Nicholas', 'Christine', 'Eric', 'Samantha', 'Jonathan', 'Deborah', 'Stephen', 'Rachel',
  'Larry', 'Carolyn', 'Justin', 'Janet', 'Scott', 'Virginia', 'Brandon', 'Maria',
  'Benjamin', 'Heather', 'Samuel', 'Diane', 'Frank', 'Julie', 'Gregory', 'Joyce',
  'Raymond', 'Victoria', 'Alexander', 'Kelly', 'Patrick', 'Christina', 'Jack', 'Joan',
  'Dennis', 'Evelyn', 'Jerry', 'Judith', 'Tyler', 'Megan', 'Aaron', 'Cheryl',
  'Jose', 'Andrea', 'Henry', 'Hannah', 'Adam', 'Jacqueline', 'Douglas', 'Martha',
  'Nathan', 'Gloria', 'Zachary', 'Teresa', 'Kyle', 'Sara', 'Noah', 'Janice',
  'Ethan', 'Marie', 'Jeremy', 'Julia', 'Walter', 'Grace', 'Harold', 'Judy',
  'Carl', 'Theresa', 'Arthur', 'Madison', 'Gerald', 'Beverly', 'Roger', 'Denise',
  'Keith', 'Marilyn', 'Lawrence', 'Amber', 'Sean', 'Danielle', 'Christian', 'Brittany',
  'Albert', 'Diana', 'Joe', 'Abigail', 'Ethan', 'Jane', 'Wayne', 'Lori',
  'Ralph', 'Alexis', 'Mason', 'Kathryn', 'Roy', 'Lauren', 'Juan', 'Shannon',
  'Louis', 'Stephanie', 'Philip', 'Erin', 'Johnny', 'Kimberly', 'Bobby', 'Deborah'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
  'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams',
  'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards',
  'Collins', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez',
  'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard',
  'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez',
  'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price',
  'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster',
  'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell', 'Sullivan', 'Bell', 'Coleman',
  'Butler', 'Henderson', 'Barnes', 'Gonzales', 'Fisher', 'Vasquez', 'Simmons', 'Romero',
  'Jordan', 'Patterson', 'Alexander', 'Hamilton', 'Graham', 'Reynolds', 'Griffin', 'Wallace',
  'Moreno', 'West', 'Cole', 'Hayes', 'Chavez', 'Gibson', 'Bryant', 'Ellis',
  'Stevens', 'Murray', 'Ford', 'Marshall', 'Owens', 'Mcdonald', 'Harrison', 'Ruiz',
  'Kennedy', 'Wells', 'Alvarez', 'Woods', 'Mendoza', 'Burns', 'Gordon', 'Shaw',
  'Holmes', 'Rice', 'Robertson', 'Hunt', 'Black', 'Daniels', 'Palmer', 'Mills',
  'Nichols', 'Grant', 'Knight', 'Ferguson', 'Rose', 'Stone', 'Hawkins', 'Dunn',
  'Perkins', 'Hudson', 'Spencer', 'Gardner', 'Stephens', 'Payne', 'Pierce', 'Berry',
  'Matthews', 'Arnold', 'Wagner', 'Willis', 'Ray', 'Watkins', 'Olson', 'Carroll',
  'Duncan', 'Snyder', 'Hart', 'Cunningham', 'Bradley', 'Lane', 'Andrews', 'Ruiz',
  'Harper', 'Fox', 'Riley', 'Armstrong', 'Carpenter', 'Weaver', 'Greene', 'Lawrence',
  'Elliott', 'Chavez', 'Sims', 'Austin', 'Peters', 'Kelley', 'Franklin', 'Lawson'
];

export class TestUserGenerator {
  private pool: Pool;
  private passwordHash!: string; // Will be initialized in generateUsers method

  constructor() {
    this.pool = pool;
  }

  async generateUsers(count: number = 200, closePool: boolean = true): Promise<void> {
    console.log(`🚀 Starting test user generation (${count} users)...\n`);
    console.log('⚠️  WARNING: This is a DEV-ONLY script!\n');

    try {
      // Hash password once for all users
      const saltRounds = 10;
      this.passwordHash = await bcrypt.hash('fakepassword123', saltRounds);

      const client = await this.pool.connect();
      let successCount = 0;
      let errorCount = 0;
      let subscribedCount = 0;
      const usedEmails = new Set<string>();

      try {
        // Get existing emails to avoid conflicts
        const existingEmailsResult = await client.query(
          "SELECT email FROM users WHERE email LIKE '%@devmail.fake'"
        );
        existingEmailsResult.rows.forEach((row: any) => {
          usedEmails.add(row.email.toLowerCase());
        });
        
        for (let i = 0; i < count; i++) {
          try {
            const user = this.generateRandomUser(usedEmails);
            usedEmails.add(user.email.toLowerCase());

            const userResult = await client.query(
              `INSERT INTO users (email, password, first_name, last_name, phone)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id, email`,
              [user.email, this.passwordHash, user.firstName, user.lastName, user.phone]
            );

            const createdUser = userResult.rows[0];

            // Randomly subscribe some users to newsletter (30-50% chance)
            const shouldSubscribe = Math.random() < 0.4; // 40% chance
            if (shouldSubscribe) {
              try {
                await client.query(
                  `INSERT INTO newsletter_subscriptions (email, status, source)
                   VALUES ($1, 'active', 'website')
                   ON CONFLICT (email) 
                   DO UPDATE SET status = 'active', updated_at = CURRENT_TIMESTAMP`,
                  [createdUser.email]
                );
                subscribedCount++;
              } catch (subError: any) {
                // Ignore subscription errors, user was still created
                console.warn(`⚠️  Failed to subscribe user ${createdUser.email}:`, subError.message);
              }
            }

            successCount++;

            if ((i + 1) % 50 === 0) {
              console.log(`👤 Generated ${i + 1}/${count} users...`);
            }
          } catch (error: any) {
            errorCount++;
            if (error.code !== '23505') { // Ignore duplicate email errors
              console.error(`❌ Error generating user ${i + 1}:`, error.message);
            }
          }
        }
      } finally {
        client.release();
      }

      console.log('\n' + '='.repeat(60));
      console.log('📊 Generation Summary');
      console.log('='.repeat(60));
      console.log(`✅ Successfully generated: ${successCount} users`);
      console.log(`📬 Subscribed to newsletter: ${subscribedCount} users (${((subscribedCount / successCount) * 100).toFixed(1)}%)`);
      console.log(`❌ Failed: ${errorCount} users`);
      console.log(`📧 All users have email domain: @devmail.fake`);
      console.log(`🔑 All passwords: fakepassword123`);
      console.log('='.repeat(60) + '\n');

    } catch (error: any) {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    } finally {
      if (closePool) {
        await this.pool.end();
      }
    }
  }

  private generateRandomUser(usedEmails: Set<string>): {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  } {
    const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    
    // Generate unique email
    let email: string;
    let attempts = 0;
    do {
      const randomNum = Math.floor(Math.random() * 1000000);
      const randomStr = Math.random().toString(36).substring(2, 8);
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${randomNum}${randomStr}@devmail.fake`;
      attempts++;
      if (attempts > 100) {
        // Fallback to timestamp if too many conflicts
        email = `user.${Date.now()}.${Math.random().toString(36).substring(2, 8)}@devmail.fake`;
        break;
      }
    } while (usedEmails.has(email.toLowerCase()));

    // Generate random phone number (US format)
    const areaCode = Math.floor(Math.random() * 800) + 200; // 200-999
    const exchange = Math.floor(Math.random() * 800) + 200; // 200-999
    const number = Math.floor(Math.random() * 10000); // 0000-9999
    const phone = `+1${areaCode}${exchange}${number.toString().padStart(4, '0')}`;

    return {
      email,
      firstName,
      lastName,
      phone
    };
  }
}

// Main execution (only if run directly, not when imported)
if (require.main === module) {
  const count = process.argv[2] ? parseInt(process.argv[2], 10) : 200;

  if (isNaN(count) || count <= 0) {
    console.error('❌ Invalid count. Please provide a positive number.');
    process.exit(1);
  }

  const generator = new TestUserGenerator();
  generator.generateUsers(count).catch(error => {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  });
}

