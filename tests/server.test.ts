import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';
import {
  Client,
  StreamableHTTPClientTransport,
} from '@modelcontextprotocol/client';

const baseUrl = 'http://127.0.0.1:3000/mcp';

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      await fetch(baseUrl);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }
  throw new Error('MCP server did not start on port 3000');
}

test('lists and calls an Advbox tool', async () => {
  const server = spawn(process.execPath, ['--import', 'tsx', 'src/main.ts'], {
    cwd: process.cwd(),
    stdio: 'ignore',
  });

  const client = new Client({ name: 'test-client', version: '1.0.0' });
  try {
    await waitForServer();

    await client.connect(new StreamableHTTPClientTransport(new URL(baseUrl)));

    const tools = await client.listTools();
    assert.ok(tools.tools.some((tool) => tool.name === 'configuracoes_conta'));

    const result = await client.callTool({
      name: 'configuracoes_conta',
      arguments: {},
    });

    assert.equal(result.isError, true);
    assert.deepEqual(result.content, [{
      type: 'text',
      text: 'Token da ADVBOX não configurado. Defina ADVBOX_TOKEN no ambiente do servidor.'
    }]);
  } finally {
    await client.close();
    server.kill();
  }
});
