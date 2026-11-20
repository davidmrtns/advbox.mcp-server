import type { Logger } from './logger.js';

export interface HttpClientOptions {
  headers?: HeadersInit;
  timeoutMs?: number;
  logger?: Logger;
}

export class HttpClientError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly responseBody?: string,
    public readonly headers?: Headers,
  ) {
    super(message);
    this.name = 'HttpClientError';
  }
}

export class HttpClient {
  constructor(
    private readonly baseUrl: string,
    private readonly options: HttpClientOptions = {},
  ) {
    try {
      new URL(baseUrl);
    } catch {
      throw new Error(`Invalid HTTP service base URL: ${baseUrl}`);
    }
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const url = new URL(path, `${this.baseUrl.replace(/\/$/, '')}/`);
    const method = init.method?.toUpperCase() ?? 'GET';
    const timeoutMs = this.options.timeoutMs ?? 10_000;

    const headers = new Headers(this.options.headers);
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));

    if (init.body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), timeoutMs);
    const startedAt = performance.now();

    this.options.logger?.debug('HTTP client request started', {
      method,
      url: `${url.origin}${url.pathname}`,
    });

    let response: Response;
    try {
      response = await fetch(url, {
        ...init,
        method,
        headers,
        signal: abortController.signal,
      });
    } catch (error) {
      if (abortController.signal.aborted) {
        throw new HttpClientError(`HTTP request timed out after ${timeoutMs}ms`);
      }

      throw new HttpClientError(
        `HTTP request failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      clearTimeout(timeout);
    }

    const responseBody = await response.text();
    const durationMs = Math.round(performance.now() - startedAt);

    this.options.logger?.debug('HTTP client request completed', {
      method,
      url: `${url.origin}${url.pathname}`,
      status: response.status,
      durationMs,
    });

    if (!response.ok) {
      throw new HttpClientError(
        `HTTP request returned ${response.status} ${response.statusText}`.trim(),
        response.status,
        responseBody,
        response.headers,
      );
    }

    if (!responseBody) {
      return undefined as T;
    }

    try {
      return JSON.parse(responseBody) as T;
    } catch {
      return responseBody as T;
    }
  }

  get<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.request<T>(path, { ...init, method: 'GET' });
  }

  post<T>(path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
    return this.request<T>(path, {
      ...init,
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  put<T>(path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
    return this.request<T>(path, {
      ...init,
      method: 'PUT',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  patch<T>(path: string, body?: unknown, init: RequestInit = {}): Promise<T> {
    return this.request<T>(path, {
      ...init,
      method: 'PATCH',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }

  delete<T>(path: string, init: RequestInit = {}): Promise<T> {
    return this.request<T>(path, { ...init, method: 'DELETE' });
  }
}
