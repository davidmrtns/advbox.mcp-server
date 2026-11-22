import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';

const baseUrl = 'http://127.0.0.1:3000/mcp';
const healthUrl = 'http://127.0.0.1:3000/health/live';

async function waitForServer(): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const response = await fetch(healthUrl);
      if (response.ok) return;
    } catch {
      // Server not listening yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  throw new Error('MCP server did not start on port 3000');
}

test('requires MCP authentication and lists Advbox tools', async () => {
  const server = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      MCP_AUTH_TOKENS: 'test-mcp-token',
      ADVBOX_TOKEN: '',
    },
    stdio: 'ignore',
  });

  const client = new Client({ name: 'test-client', version: '1.0.0' });
  try {
    await waitForServer();

    const unauthorized = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      }),
    });
    assert.equal(unauthorized.status, 401);

    await client.connect(
      new StreamableHTTPClientTransport(new URL(baseUrl), {
        authProvider: {
          token: async () => 'test-mcp-token',
        },
        requestInit: {
          headers: {
            'X-ADVBOX-API-KEY': 'test-advbox-key',
          },
        },
      }),
    );

    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === 'configuracoes_conta'));
  } finally {
    await client.close();

    if (server.exitCode === null) {
      server.kill();
    }
  }
});
