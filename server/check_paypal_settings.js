
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkSettings() {
  try {
    const res = await pool.query("SELECT region, setting_key, setting_value FROM region_settings WHERE setting_key LIKE 'paypal_%'");
    console.log('Current PayPal Settings:');
    res.rows.forEach(row => {
      const val = row.setting_value;
      const masked = val.length > 8 ? val.substring(0, 4) + '...' + val.substring(val.length - 4) : (val ? '***' : '(empty)');
      console.log(`${row.region} - ${row.setting_key}: ${masked}`);
    });
    
    console.log('\nEnvironment:');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
  } catch (err) {
    console.error('Error querying database:', err);
  } finally {
    await pool.end();
  }
}

checkSettings();

