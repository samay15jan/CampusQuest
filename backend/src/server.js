// Entry point: starts the HTTP server and the event scheduler.
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { tick } from './services/eventService.js';

const app = await buildApp();

try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Event lifecycle: activate scheduled events, finalise finished ones, create next week's event.
const run = () => tick().catch((err) => app.log.error({ err }, 'scheduler tick failed'));
run();
const timer = setInterval(run, 30_000);
timer.unref();

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    clearInterval(timer);
    await app.close();
    process.exit(0);
  });
}
