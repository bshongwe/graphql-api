import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { resolvers } from '../resolvers/index.js';
import { subscriptionHandlers } from '../resolvers/subscriptionResolvers.js';
import { createContext } from '../../context.js';
import { logger } from '../../infrastructure/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Create GraphQL schema for subscriptions
 */
function createSubscriptionSchema() {
  const typeDefs = readFileSync(join(__dirname, '../schema.graphql'), 'utf8');

  return buildSubgraphSchema({ typeDefs, resolvers });
}

/**
 * Create WebSocket server for GraphQL subscriptions
 */
export async function createWebSocketServer(httpServer: any) {
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
      context: async (ctx, msg, args) => {
        // Create context similar to HTTP context but for WebSocket connections
        return createContext({ req: ctx.extra.request });
      },

      // Connection lifecycle handlers
      onConnect: subscriptionHandlers.onConnect,
      onDisconnect: subscriptionHandlers.onDisconnect,

      // Operation lifecycle handlers
      onSubscribe: async (ctx, msg) => {
        logger.info(
          {
            operationName: msg.payload.operationName,
            connectionParams: ctx.connectionParams,
          },
          'WebSocket subscription started'
        );

        return subscriptionHandlers.onOperationStart?.(msg, msg.payload, ctx);
      },

      onComplete: async (ctx, msg) => {
        logger.info(
          {
            operationId: msg.id,
          },
          'WebSocket subscription completed'
        );

        return subscriptionHandlers.onOperationComplete?.(ctx, msg.id);
      },

      onNext: async (ctx, msg, args, result) => {
        logger.debug(
          {
            operationId: msg.id,
            dataKeys: result.data ? Object.keys(result.data) : [],
          },
          'WebSocket subscription data sent'
        );
      },

      onError: async (ctx, msg, errors) => {
        logger.error(
          {
            operationId: msg.id,
            errors: errors.map(e => ({ message: e.message, path: e.path })),
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
