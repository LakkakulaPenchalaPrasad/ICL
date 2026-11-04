import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/icl_db';

let cachedPromise = null;

export async function connectToDatabase() {
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // If a connection attempt is already in progress, wait for it
  if (!cachedPromise) {
    const opts = {
      bufferCommands: false, // Prevents queries from hanging indefinitely on network hiccups
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };
    cachedPromise = mongoose.connect(MONGODB_URI, opts).then((m) => {
      console.log('Connected to MongoDB Atlas successfully!');
      return m;
    });
  }

  try {
    await cachedPromise;
    return mongoose.connection;
  } catch (err) {
    cachedPromise = null; // Reset promise so next invocation can retry cleanly
    console.error('Database connection error:', err.message);
    throw err;
  }
}
