import type { McpServer } from '@modelcontextprotocol/server';
import type * as z from 'zod/v4';

export interface McpToolConfig<TSchema extends z.ZodType = z.ZodType> {
  name: string;
  title?: string;
  description?: string;
  schema: TSchema;
  outputSchema?: z.ZodType;
  annotations?: unknown;
  icons?: unknown[];
  _meta?: Record<string, unknown>;
  handler: (args: z.infer<TSchema>) => unknown | Promise<unknown>;
}

interface RegisteredTool {
  name: string;
  config: {
    title?: string;
    description?: string;
    inputSchema: z.ZodType;
    outputSchema?: z.ZodType;
    annotations?: unknown;
    icons?: unknown[];
    _meta?: Record<string, unknown>;
  };
  handler: (args: never) => unknown;
}

const registeredTools: RegisteredTool[] = [];

export function McpTool<TSchema extends z.ZodType>(
  config: McpToolConfig<TSchema>,
): (args: z.infer<TSchema>) => unknown | Promise<unknown> {
  if (registeredTools.some((tool) => tool.name === config.name)) {
    throw new Error(`Duplicate MCP tool name: ${config.name}`);
  }

  registeredTools.push({
    name: config.name,
    config: {
      title: config.title,
      description: config.description,
      inputSchema: config.schema,
      outputSchema: config.outputSchema,
      annotations: config.annotations,
      icons: config.icons,
      _meta: config._meta,
    },
    handler: config.handler as (args: never) => unknown,
  });

  return config.handler;
}

export function registerMcpTools(server: McpServer): void {
  for (const tool of registeredTools) {
    server.registerTool(tool.name, tool.config as never, tool.handler as never);
  }
}

export function clearMcpToolRegistry(): void {
  registeredTools.length = 0;
}
