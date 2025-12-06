
import { pool } from '../config/database';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Explicitly load .env from server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

async function checkEmailLogs() {
  console.log('DEBUG: Checking Environment...');
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    // Mask password in URL
    const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
    console.log(`DEBUG: DATABASE_URL is set: ${maskedUrl}`);
  } else {
    console.log('DEBUG: DATABASE_URL is NOT set. Using default.');
  }

  try {
    const client = await pool.connect();
    console.log('--- Email Configuration Check ---');
    
    // Check Region Settings
    const settings = await client.query(`
      SELECT region, setting_key, setting_value 
      FROM region_settings 
      WHERE setting_key IN ('smtp_enabled', 'smtp_host', 'smtp_port', 'smtp_user', 'smtp_test_mode', 'smtp_password')
      ORDER BY region, setting_key
    `);
    
    console.log('\nRegion Settings:');
    settings.rows.forEach(row => {
      let value = row.setting_value;
      if (row.setting_key === 'smtp_password') {
        value = value ? (value.endsWith('xxxxx') ? '[MASKED IN DB]' : '[PRESENT]') : '[EMPTY]';
      }
      console.log(`${row.region} - ${row.setting_key}: ${value}`);
    });

    console.log('\n--- Recent Email Logs (Last 5) ---');
    const logs = await client.query(`
      SELECT id, template_type, recipient_email, status, error_message, sent_at, created_at 
      FROM email_logs 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    if (logs.rows.length === 0) {
      console.log('No email logs found.');
    } else {
      logs.rows.forEach(log => {
        console.log(`\nID: ${log.id}`);
        console.log(`Type: ${log.template_type}`);
        console.log(`Recipient: ${log.recipient_email}`);
        console.log(`Status: ${log.status}`);
        if (log.error_message) console.log(`Error: ${log.error_message}`);
        console.log(`Created: ${log.created_at}`);
        console.log(`Sent: ${log.sent_at}`);
      });
    }
    client.release();
  } catch (error) {
    console.error('Error checking logs:', error);
  } finally {
    pool.end();
  }
}

checkEmailLogs();
