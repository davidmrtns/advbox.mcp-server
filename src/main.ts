import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import {
  hostHeaderValidation,
  originValidation,
  toNodeHandler,
} from '@modelcontextprotocol/node';
import handler from './server.js';
import { getServerConfig, MCP_PATH } from './config/server.config.js';
import { Logger, parseLogLevel } from './utils/logger.js';

const { host, port, allowedHosts, allowedOrigins } = getServerConfig();
const logger = new Logger(parseLogLevel(process.env.LOG_LEVEL));

const nodeHandler = toNodeHandler(handler);
const validateHost = hostHeaderValidation(allowedHosts);
const validateOrigin = originValidation(allowedOrigins);

const server = createServer((req, res) => {
  const requestId = req.headers['x-request-id']?.toString() || randomUUID();
  const startedAt = performance.now();

  res.setHeader('x-request-id', requestId);
  res.on('finish', () => {
    logger.info('HTTP request completed', {
      requestId,
      method: req.method,
      path: req.url,
      status: res.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
    });
  });

  const url = new URL(req.url ?? '/', 'http://localhost');

  if (url.pathname === '/health/live') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  if (url.pathname === '/health/ready') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ready' }));
    return;
  }

  if (!validateHost(req, res) || !validateOrigin(req, res)) return;

  if (url.pathname !== MCP_PATH) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found', requestId }));
    return;
  }

  void Promise.resolve(nodeHandler(req, res)).catch((error) => {
    logger.error('Node HTTP handler error', error, { requestId });
  });
});

server.on('clientError', (error, socket) => {
  logger.warn('HTTP client error', { error: error.message });
  socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info('Shutdown initiated', { signal });

  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });

  await handler.close();
  logger.info('Shutdown complete', { signal });
}

process.once('SIGTERM', () => {
  void shutdown('SIGTERM').finally(() => process.exit(0));
});

process.once('SIGINT', () => {
  void shutdown('SIGINT').finally(() => process.exit(0));
});

process.once('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.once('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', error);
  process.exit(1);
});

server.listen(port, host, () => {
  logger.info(`Server is up at http://${host}:${port}${MCP_PATH}`, {
    host,
    port,
    mcpPath: MCP_PATH,
  });
});
