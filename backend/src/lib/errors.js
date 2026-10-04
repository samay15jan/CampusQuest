// Errors that carry an HTTP status. The Fastify error handler in app.js turns them
// into { "error": "message" } responses.
export class GameError extends Error {
  constructor(statusCode, message, extra = {}) {
    super(message);
    this.name = 'GameError';
    this.statusCode = statusCode;
    Object.assign(this, extra); // e.g. { retryAfter: 12 }
  }
}

export const httpError = (statusCode, message, extra) => new GameError(statusCode, message, extra);
