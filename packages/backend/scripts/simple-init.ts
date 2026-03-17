import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  database: 'water_management',
  user: 'wateradmin',
  password: 'waterpass123',
});

async function main() {
  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('✓ Connected successfully!');
    
    console.log('Reading schema file...');
    const schemaPath = path.join(__dirname, '..', 'src', 'database', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Executing schema...');
    await client.query(schema);
    console.log('✓ Database schema initialized successfully!');
    
    client.release();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await pool.end();
    process.exit(1);
  }
}

main();
