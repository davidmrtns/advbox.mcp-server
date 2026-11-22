import { HttpClient, HttpClientError } from '../utils/http-client.js';

export interface AdvboxServiceOptions {
  baseUrl?: string;
  token?: string;
  maxText?: number;
  maxPerMinute?: number;
}

export interface AdvboxResult {
  ok: boolean;
  text: string;
}

export class AdvboxService {
  private readonly baseUrl: string;
  private readonly token: string | undefined;
  private readonly maxText: number;
  private readonly maxPerMinute: number;
  private readonly http: HttpClient;
  private readonly stamps: number[] = [];

  constructor(options: AdvboxServiceOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'https://app.advbox.com.br/api/v1').replace(/\/$/, '');
    this.token = options.token;
    this.maxText = options.maxText ?? 150_000;
    this.maxPerMinute = options.maxPerMinute ?? 30;

    this.http = new HttpClient(this.baseUrl, {
      timeoutMs: 60_000,
      headers: {
        Accept: 'application/json',
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      },
    });
  }

  async get(
    pathTemplate: string,
    args: Record<string, unknown> = {},
    requestToken?: string,
  ): Promise<AdvboxResult> {
    const effectiveToken = requestToken?.trim() || this.token;

    if (!effectiveToken) {
      return {
        ok: false,
        text: 'Token da ADVBOX não configurado. Envie o header X-ADVBOX-API-KEY.',
      };
    }

    let path = pathTemplate;
    const query: Record<string, string> = {};

    for (const [key, value] of Object.entries(args)) {
      if (value === undefined || value === null || value === '') continue;

      const placeholder = `{${key}}`;
      if (path.includes(placeholder)) {
        path = path.replace(placeholder, encodeURIComponent(String(value)));
      } else {
        query[key] = String(value);
      }
    }

    const shown = `GET ${path}${this.formatQuery(query)}`;

    for (let attempt = 1; attempt <= 2; attempt++) {
      await this.acquireSlot();

      try {
        const result = await this.http.get<unknown>(path, {
          method: 'GET',
          redirect: 'manual',
          headers: {
            Authorization: `Bearer ${effectiveToken}`,
          },
        });

        if (result === undefined) {
          return { ok: true, text: `${shown}\n204 - Nenhum registro encontrado.` };
        }

        return {
          ok: true,
          text: `${shown}\n${this.formatText(result)}`,
        };
      } catch (error) {
        if (!(error instanceof HttpClientError)) {
          return {
            ok: false,
            text: `Falha de rede ao consultar a ADVBOX: ${error instanceof Error ? error.message : String(error)}`,
          };
        }

        if (error.status === 429) {
          const retryAfter = this.getRetryAfter(error.headers);
          if (attempt === 1 && (!retryAfter || retryAfter <= 65)) {
            await this.sleep(retryAfter ? retryAfter * 1000 + 500 : 60_000);
            continue;
          }

          const waitText = retryAfter
            ? `A ADVBOX pede para aguardar ${retryAfter} s.`
            : 'A ADVBOX não informou o tempo de espera.';
          return {
            ok: false,
            text: `${shown}\n429 - Limite de requisições da conta atingido. ${waitText}`,
          };
        }

        if (error.status === 204) {
          return { ok: true, text: `${shown}\n204 - Nenhum registro encontrado.` };
        }

        if (error.status && error.status >= 300 && error.status < 400) {
          return {
            ok: false,
            text: `${shown}\nA ADVBOX redirecionou para o login (${error.status}): o token parece inválido ou expirado.`,
          };
        }

        if (error.status === 401) {
          return {
            ok: false,
            text: `${shown}\n401 - Token inválido ou ausente.\n${this.formatText(error.responseBody ?? '')}`,
          };
        }

        return {
          ok: false,
          text: `${shown}\nErro ${error.status ?? 'de conexão'}.\n${this.formatText(error.responseBody ?? '')}`,
        };
      }
    }

    return {
      ok: false,
      text: 'A ADVBOX continuou respondendo 429. Tente novamente em 1 minuto.',
    };
  }

  private async acquireSlot(): Promise<void> {
    for (;;) {
      const now = Date.now();
      while (this.stamps.length > 0) {
        const oldestStamp = this.stamps[0];
        if (oldestStamp === undefined || now - oldestStamp < 60_000) break;
        this.stamps.shift();
      }

      if (this.stamps.length < this.maxPerMinute) {
        this.stamps.push(now);
        return;
      }

      const oldestStamp = this.stamps[0];
      if (oldestStamp === undefined) continue;

      const waitMs = 60_000 - (now - oldestStamp) + 50;
      await this.sleep(waitMs);
    }
  }

  private formatQuery(query: Record<string, string>): string {
    const params = new URLSearchParams(query);
    const value = params.toString();
    return value ? `?${value}` : '';
  }

  private formatText(value: unknown): string {
    let text: string;

    if (typeof value === 'string') {
      try {
        text = JSON.stringify(JSON.parse(value), null, 1);
      } catch {
        text = value;
      }
    } else {
      text = JSON.stringify(value, null, 1);
    }

    if (text.length <= this.maxText) return text;

    return `${text.slice(0, this.maxText)}\n\n[resposta cortada em ${this.maxText} caracteres - use filtros, limit menor ou offset para paginar]`;
  }

  private getRetryAfter(headers: Headers | undefined): number | undefined {
    const value = headers?.get('retry-after');
    if (!value) return undefined;

    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds >= 0 ? seconds : undefined;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
