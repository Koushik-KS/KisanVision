import app from './app.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import env from './config/env.js';

let server;

const startServer = async () => {
  try {
    await connectDatabase();

    server = app.listen(env.port, () => {
      console.log(`KisanVision AI server listening on port ${env.port} (${env.nodeEnv})`);
    });
  } catch (err) {
    console.error('Failed to start KisanVision AI server:', err.message);
    process.exit(1);
  }
};

startServer();

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
  if (server) {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
