import app from './app.js';
import { connectToDatabase } from './config/db.js';
import { seedDatabaseIfEmpty } from './seedData.js';

const PORT = process.env.PORT || 5000;

async function start() {
  // Start HTTP server immediately so port 5000 is open before Vite proxy connects
  app.listen(PORT, () => {
    console.log(`ResolveIT API Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });

  // Connect to database in background
  try {
    console.log('Connecting to MongoDB Atlas Cluster...');
    await connectToDatabase();

    // Seed demo data if database is empty
    await seedDatabaseIfEmpty();
  } catch (err) {
    console.error('Database connection warning (running in fallback mode):', err.message);
  }
}

start();
