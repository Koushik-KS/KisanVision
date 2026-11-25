import app from './app.js';
import env from './config/env.js';

const server = app.listen(env.port, () => {
  console.log(`KisanVision AI server listening on port ${env.port} (${env.nodeEnv})`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Promise Rejection:', reason);
  server.close(() => {
    process.exit(1);
  });
});
