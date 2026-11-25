import mongoose from 'mongoose';
import env from './env.js';

let listenersRegistered = false;

/**
 * Connect to MongoDB Atlas via Mongoose using MONGODB_URI.
 * Throws if MONGODB_URI is missing or connection fails so the server never runs silently without DB.
 */
export const connectDatabase = async (uriOverride) => {
  const uri = uriOverride || env.mongodbUri;

  if (!uri) {
    throw new Error('MONGODB_URI is not configured in server environment variables.');
  }

  if (!listenersRegistered) {
    mongoose.connection.on('disconnected', () => {
      console.error('MongoDB disconnected.');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });

    listenersRegistered = true;
  }

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log(`MongoDB connected (${mongoose.connection.host})`);
  return mongoose.connection;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export const isDatabaseConnected = () => mongoose.connection.readyState === 1;
