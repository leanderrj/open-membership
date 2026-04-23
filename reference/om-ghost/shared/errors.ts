/**
 * Typed application errors with HTTP mapping.
 *
 * All handlers raise HttpError (or one of its subclasses). The top-level
 * error middleware maps them to consistent JSON response bodies and logs
 * them with the request-scoped logger.
 */

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "HttpError";
  }

  toResponseBody(): ErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class BadRequestError extends HttpError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(400, "bad_request", message, details);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = "unauthorized") {
    super(401, "unauthorized", message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(message = "forbidden") {
    super(403, "forbidden", message);
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(404, "not_found", message);
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(409, "conflict", message);
  }
}

export class RateLimitedError extends HttpError {
  constructor(public readonly retryAfterSeconds: number) {
    super(429, "rate_limited", "rate limit exceeded", {
      retry_after_seconds: retryAfterSeconds,
    });
  }
}

export class UpstreamError extends HttpError {
  constructor(service: string, message: string) {
    super(502, "upstream_error", `${service}: ${message}`);
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(`om-ghost configuration error: ${message}`);
    this.name = "ConfigError";
  }
}
