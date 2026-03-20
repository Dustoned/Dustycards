/**
 * Centralized error handling middleware.
 * Converts errors into consistent JSON responses.
 */

/**
 * Map common axios/HTTP errors to meaningful messages.
 * @param {Error} err
 * @returns {{ status: number, message: string, details?: string }}
 */
function parseError(err) {
  // Axios error with response from upstream API
  if (err.response) {
    const upstream = err.response;
    if (upstream.status === 429) {
      return {
        status: 429,
        message: 'Rate limit reached. Please try again shortly.',
        details: err.message,
      };
    }
    if (upstream.status === 401 || upstream.status === 403) {
      return {
        status: 502,
        message: 'Upstream API authentication failed. Check your API key.',
        details: err.message,
      };
    }
    if (upstream.status === 404) {
      return {
        status: 404,
        message: 'Resource not found in upstream API.',
        details: err.message,
      };
    }
    return {
      status: 502,
      message: 'Upstream API error.',
      details: `${upstream.status} ${upstream.statusText}`,
    };
  }

  // Axios network error (no response)
  if (err.request) {
    return {
      status: 503,
      message: 'Could not reach the PokéWallet API. Check your network connection.',
      details: err.message,
    };
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return {
      status: 400,
      message: err.message,
    };
  }

  // File system errors
  if (err.code === 'ENOENT') {
    return {
      status: 500,
      message: 'Data file not found.',
      details: err.message,
    };
  }

  // Generic
  return {
    status: err.status || err.statusCode || 500,
    message: err.message || 'An unexpected error occurred.',
  };
}

/**
 * Express error handler middleware.
 * Must have 4 parameters to be recognized as error handler.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  const { status, message, details } = parseError(err);

  const isDev = process.env.NODE_ENV === 'development';

  const body = {
    error: message,
    ...(details && { details }),
    ...(isDev && { stack: err.stack }),
  };

  console.error(`[ERROR] ${req.method} ${req.path} → ${status}: ${message}`);
  if (isDev && err.stack) {
    console.error(err.stack);
  }

  res.status(status).json(body);
}

module.exports = { errorHandler };
