import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

console.log('Connection parameters:');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_NAME:', process.env.DB_NAME);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD ? '***' : 'NOT SET');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'water_management',
  user: process.env.DB_USER || 'wateradmin',
  password: process.env.DB_PASSWORD || 'waterpass123',
});

async function test() {
  try {
    console.log('\nAttempting connection...');
    const client = await pool.connect();
    console.log('✓ Connected successfully!');
    
    const result = await client.query('SELECT current_user, current_database()');
    console.log('Current user:', result.rows[0].current_user);
    console.log('Current database:', result.rows[0].current_database);
    
    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Connection failed:', error);
    await pool.end();
    process.exit(1);
  }
}

test();
