/**
 * Application errors. Throwing one of these from anywhere in a request gets
 * translated by the global error handler into a clean JSON response with the
 * right status code — without ever leaking stack traces or internals to the
 * client.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const BadRequest = (msg = 'Bad request') =>
  new AppError(400, 'BAD_REQUEST', msg);
export const Unauthorized = (msg = 'Authentication required') =>
  new AppError(401, 'UNAUTHORIZED', msg);
export const Forbidden = (msg = 'You do not have access to this resource') =>
  new AppError(403, 'FORBIDDEN', msg);
export const NotFound = (msg = 'Resource not found') =>
  new AppError(404, 'NOT_FOUND', msg);
export const Conflict = (msg = 'Resource already exists') =>
  new AppError(409, 'CONFLICT', msg);
