import assert from 'node:assert/strict';
import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from 'node:http';
import test from 'node:test';
import { HttpClient, HttpClientError } from '../src/utils/index.js';

async function withServer(
  handler: (
    request: IncomingMessage,
    response: ServerResponse<IncomingMessage>,
  ) => void | Promise<void>,
  run: (baseUrl: string) => Promise<void>,
): Promise<void> {
  const server = createServer(handler);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('HttpClient sends JSON and reads JSON responses', async () => {
  await withServer(async (req, res) => {
    assert.equal(req.method, 'POST');
    assert.equal(req.headers['content-type'], 'application/json');

    let body = '';
    for await (const chunk of req) body += chunk;

    assert.deepEqual(JSON.parse(body), { text: 'hello' });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ saved: true }));
  }, async (baseUrl) => {
    const client = new HttpClient(baseUrl);
    const result = await client.post<{ saved: boolean }>('/notes', { text: 'hello' });

    assert.deepEqual(result, { saved: true });
  });
});

test('HttpClient throws HttpClientError for unsuccessful responses', async () => {
  await withServer((_req, res) => {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Not found' }));
  }, async (baseUrl) => {
    const client = new HttpClient(baseUrl);

    await assert.rejects(
      client.get('/missing'),
      (error: unknown) => {
        assert.ok(error instanceof HttpClientError);
        assert.equal(error.status, 404);
        assert.match(error.responseBody ?? '', /Not found/);
        return true;
      },
    );
  });
});
