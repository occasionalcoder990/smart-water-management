import { initializeSchema, testConnection, closePool } from '../src/database/connection';

async function main() {
  console.log('Initializing database schema...\n');

  const isConnected = await testConnection();
  if (!isConnected) {
    console.error('\n❌ Cannot initialize schema - database connection failed');
    process.exit(1);
  }

  try {
    await initializeSchema();
    console.log('\n✅ Database schema initialized successfully!');
  } catch (error) {
    console.error('\n❌ Failed to initialize schema:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

main();
