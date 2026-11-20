export const MCP_PATH = '/mcp';

const DEFAULT_ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]'];

export interface ServerConfig {
  host: string;
  port: number;
  allowedHosts: string[];
  allowedOrigins: string[];
}

function parseAllowedValues(value: string | undefined, defaults: string[]): string[] {
  const values = value
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return values?.length ? values : defaults;
}

function parsePort(value: string | undefined): number {
  const port = Number.parseInt(value ?? '3000', 10);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${value ?? '3000'}`);
  }

  return port;
}

export function getServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  return {
    host: env.HOST ?? '127.0.0.1',
    port: parsePort(env.PORT),
    allowedHosts: parseAllowedValues(env.ALLOWED_HOSTS, DEFAULT_ALLOWED_HOSTS),
    allowedOrigins: parseAllowedValues(env.ALLOWED_ORIGINS, DEFAULT_ALLOWED_HOSTS),
  };
}
