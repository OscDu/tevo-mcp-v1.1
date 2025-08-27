#!/usr/bin/env node

// Load environment variables without any output
import { config as dotenvConfig } from 'dotenv';
const originalStdout = process.stdout.write;
const originalStderr = process.stderr.write;

// Temporarily silence stdout/stderr during dotenv loading
process.stdout.write = () => true as any;
process.stderr.write = () => true as any;

dotenvConfig();

// Restore stdout/stderr
process.stdout.write = originalStdout;
process.stderr.write = originalStderr;

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { loadConfig, validateConfig } from './utils/config.js';
import { TevoApiClient } from './client/tevo-api.js';
import { MemoryCache } from './cache/memory-cache.js';
import { createTools, handleToolCall } from './tools/index.js';
const server = new Server(
  {
    name: 'tevo-mcp-server',
    version: '1.0.0',
  }
);

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    validateConfig(config);
    
    const apiClient = new TevoApiClient(config);
    const cache = new MemoryCache();
    const tools = createTools(apiClient, cache);

    console.error(JSON.stringify({
      type: 'server_startup',
      environment: config.env,
      base_url: config.baseUrl,
      tools_count: tools.length
    }));

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools,
      };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const result = await handleToolCall(name, apiClient, cache, args);
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        console.error(JSON.stringify({
          type: 'tool_error',
          tool_name: name,
          error_message: error instanceof Error ? error.message : 'Unknown error',
          error_code: (error as any)?.code || 'UNKNOWN_ERROR'
        }));

        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    });

    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error(JSON.stringify({
      type: 'server_ready',
      message: 'Ticket Evolution MCP Server is running'
    }));

  } catch (error) {
    console.error(JSON.stringify({
      type: 'server_startup_error',
      error_message: error instanceof Error ? error.message : 'Unknown startup error'
    }));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({
    type: 'unhandled_error',
    error_message: error instanceof Error ? error.message : 'Unknown error'
  }));
  process.exit(1);
});