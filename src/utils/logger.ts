export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  [key: string]: unknown;
}

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger {
  private readonly level: number;

  constructor(level: LogLevel = 'info') {
    this.level = levels[level];
  }

  debug(message: string, fields: LogFields = {}): void {
    this.write('debug', message, fields);
  }

  info(message: string, fields: LogFields = {}): void {
    this.write('info', message, fields);
  }

  warn(message: string, fields: LogFields = {}): void {
    this.write('warn', message, fields);
  }

  error(message: string, error?: unknown, fields: LogFields = {}): void {
    this.write('error', message, {
      ...fields,
      ...(error instanceof Error
        ? { error: { name: error.name, message: error.message } }
        : error !== undefined
          ? { error: String(error) }
          : {}),
    });
  }

  private write(level: LogLevel, message: string, fields: LogFields): void {
    if (levels[level] < this.level) return;

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...fields,
    };

    const output = JSON.stringify(entry);

    if (level === 'error' || level === 'warn') {
      console.error(output);
    } else {
      console.log(output);
    }
  }
}

export function parseLogLevel(value: string | undefined): LogLevel {
  if (value === 'debug' || value === 'info' || value === 'warn' || value === 'error') {
    return value;
  }

  return 'info';
}
