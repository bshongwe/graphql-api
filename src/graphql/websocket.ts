import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { GraphQLError, ExecutionResult } from 'graphql';
import type { Server } from 'http';
import { resolvers } from './resolvers/index.js';
import { subscriptionHandlers } from './resolvers/subscriptionResolvers.js';
import { createContext } from '../context.js';
import { logger } from '../infrastructure/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create GraphQL schema for subscriptions
 */
function createSubscriptionSchema() {
  const typeDefs = readFileSync(join(__dirname, './schema.graphql'), 'utf8');

  return buildSubgraphSchema({ typeDefs, resolvers });
}

/**
 * Create WebSocket server for GraphQL subscriptions
 */
export async function createWebSocketServer(httpServer: Server) {
  // Create WebSocket server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql/subscriptions',
  });

  const schema = createSubscriptionSchema();

  // Configure GraphQL WebSocket server
  const serverCleanup = useServer(
    {
      schema,
      context: async (ctx: any, _msg: any, _args: any) => {
        // Create context similar to HTTP context
        // but for WebSocket connections
        return createContext({ req: ctx.extra.request });
      },

      // Connection lifecycle handlers
      onConnect: subscriptionHandlers.onConnect,
      onDisconnect: subscriptionHandlers.onDisconnect,

      // Operation lifecycle handlers
      onSubscribe: async (ctx: any, msg: any) => {
        logger.info(
          {
            operationName: msg.payload.operationName,
            connectionParams: ctx.connectionParams,
          },
          'WebSocket subscription started'
        );

        return subscriptionHandlers.onOperationStart?.(msg, msg.payload, ctx);
      },

      onComplete: async (_ctx: any, msg: any) => {
        logger.info(
          {
            operationId: msg.id,
          },
          'WebSocket subscription completed'
        );

        return subscriptionHandlers.onOperationComplete?.(_ctx, msg.id);
      },

      onNext: async (
        _ctx: any,
        msg: any,
        _args: any,
        result: ExecutionResult
      ) => {
        logger.debug(
          {
            operationId: msg.id,
            dataKeys: result.data ? Object.keys(result.data) : [],
          },
          'WebSocket subscription data sent'
        );
      },

      onError: async (_ctx: any, msg: any, errors: readonly GraphQLError[]) => {
        logger.error(
          {
            operationId: msg.id,
            errors: errors.map(e => ({
              message: e.message,
              path: e.path,
            })),
          },
          'WebSocket subscription error'
        );
      },
    },
    wsServer
  );

  logger.info(
    'WebSocket server configured for GraphQL subscriptions ' +
      'at /graphql/subscriptions'
  );

  return {
    wsServer,
    cleanup: serverCleanup,
  };
}

/**
 * Gracefully shutdown WebSocket server
 */
export async function closeWebSocketServer(
  wsServer: WebSocketServer,
  cleanup: () => void
) {
  logger.info('Shutting down WebSocket server');

  // Stop accepting new connections
  cleanup();

  // Close existing connections
  wsServer.clients.forEach(socket => {
    socket.terminate();
  });

  // Close the server
  wsServer.close();

  logger.info('WebSocket server shutdown complete');
}
