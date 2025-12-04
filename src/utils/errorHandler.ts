export class AppError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  constructor(message: string, code = "ERR_APP", httpStatus = 400) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

// Predefined error types for common scenarios
export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, "ERR_VALIDATION", 400);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = "Authentication required") {
    super(message, "ERR_AUTHENTICATION", 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions") {
    super(message, "ERR_AUTHORIZATION", 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, "ERR_NOT_FOUND", 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists") {
    super(message, "ERR_CONFLICT", 409);
  }
}

// Error handler utility for GraphQL
export function handleError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(error.message);
  }
  
  return new AppError("An unexpected error occurred", "ERR_UNKNOWN", 500);
}