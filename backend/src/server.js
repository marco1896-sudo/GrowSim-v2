import app from './app.js';
import { env } from './config/env.js';
import { connectDb } from './config/db.js';

async function start() {
  await connectDb(env.mongodbUri);

  app.listen(env.port, () => {
    console.log(`GrowSim backend listening on port ${env.port}`);
  });
}

start().catch((err) => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
