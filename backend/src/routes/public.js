// Unauthenticated, read-only endpoints for the desktop big-screen dashboard.
import { getDashboardSnapshot } from '../services/dashboardService.js';

export default async function publicRoutes(app) {
  app.get('/public/dashboard', async (request, reply) => {
    reply.header('cache-control', 'public, max-age=3');
    return getDashboardSnapshot();
  });
}
