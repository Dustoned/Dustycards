/**
 * Request/response logger middleware.
 * Logs method, path, status, and response time.
 */

/**
 * Pad string to fixed width for aligned log output.
 */
function pad(str, len) {
  return String(str).padEnd(len, ' ').slice(0, len);
}

/**
 * Color codes for terminal output.
 */
const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
};

function statusColor(status) {
  if (status >= 500) return colors.red;
  if (status >= 400) return colors.yellow;
  if (status >= 300) return colors.cyan;
  return colors.green;
}

function methodColor(method) {
  switch (method) {
    case 'GET': return colors.blue;
    case 'POST': return colors.green;
    case 'PATCH': return colors.yellow;
    case 'DELETE': return colors.red;
    default: return colors.magenta;
  }
}

/**
 * Request logger middleware.
 */
function requestLogger(req, res, next) {
  const startTime = Date.now();

  // Override res.end to capture status and timing
  const originalEnd = res.end.bind(res);
  res.end = function (...args) {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const method = req.method;
    const path = req.path;

    const log = [
      `${colors.dim}${new Date().toISOString()}${colors.reset}`,
      `${methodColor(method)}${pad(method, 6)}${colors.reset}`,
      `${pad(path, 40)}`,
      `${statusColor(status)}${status}${colors.reset}`,
      `${colors.dim}${duration}ms${colors.reset}`,
    ].join(' ');

    console.log(log);
    originalEnd(...args);
  };

  next();
}

module.exports = { requestLogger };
