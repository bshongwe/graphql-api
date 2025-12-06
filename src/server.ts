import "reflect-metadata";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { readFileSync } from "node:fs";
import { buildSubgraphSchema } from "@apollo/subgraph";
import { parse } from "graphql";
import { collectDefaultMetrics, register } from "prom-client";
import { logger } from "./infrastructure/logger.js";
import { createContext } from "./context.js";
import { resolvers } from "./graphql/resolvers/index.js";
import { AppError } from "./utils/errorHandler.js";
import { initializePubSub, closePubSub } from "./infrastructure/pubsub.js";
import { initializeJobQueues, closeJobQueues } from "./infrastructure/jobQueue.js";
import { startJobWorkers, stopJobWorkers } from "./infrastructure/jobWorkers.js";
import { createJobDashboard, dashboardAuthMiddleware } from "./infrastructure/jobDashboard.js";

// Load environment variables
import "dotenv/config";

// Validate required environment variables
function validateEnvironment() {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    logger.error({ missing }, 'Missing required environment variables');
    process.exit(1);
  }
  
  if (process.env.JWT_SECRET === '<CHANGE-THIS-IN-PRODUCTION>') {
    logger.error('JWT_SECRET must be changed from default value');
    process.exit(1);
  }
}

async function bootstrap() {
  // Validate environment first
  validateEnvironment();
  
  // Initialize metrics collection
  collectDefaultMetrics();
  
  // Initialize Redis PubSub for subscriptions
  try {
    await initializePubSub();
    logger.info('Redis PubSub initialized for subscriptions');
  } catch (error) {
    logger.warn(error, 'Redis PubSub initialization failed, subscriptions may not work');
  }

  // Initialize job queues and workers
  try {
    await initializeJobQueues();
    await startJobWorkers();
    logger.info('Job queues and workers initialized');
  } catch (error) {
    logger.warn(error, 'Job queue initialization failed, background jobs may not work');
  }

  // Load GraphQL schema
  const typeDefs = readFileSync('./src/graphql/schema.graphql', 'utf8');

  // Create Apollo Server
  const server = new ApolloServer({
    schema: buildSubgraphSchema([{ typeDefs: parse(typeDefs), resolvers }]),
    formatError: (err: any) => {
      // Central error mapping; keep messages safe for clients
      logger.error({ err }, "GraphQL error");
      
      // Extract AppError details if available
      const originalError = err.originalError;
      if (originalError instanceof AppError) {
        return {
          message: originalError.message,
          code: originalError.code,
          path: err.path,
          extensions: {
            code: originalError.code,
            httpStatus: originalError.httpStatus,
          },
        };
      }
      
      return {
        message: err.message,
        code: err.extensions?.code,
        path: err.path,
      };
    },
  });

  const port = process.env.PORT || 4000;

  // Start the standalone server
  const { url } = await startStandaloneServer(server, {
    context: async ({ req }) => createContext({ req }),
    listen: { port: Number(port) },
  });

  logger.info(`🚀 Server ready at ${url}`);

  // Setup separate Express app for metrics and health endpoints
  const metricsApp = express();
  
  // Security middleware
  metricsApp.use(helmet());
  metricsApp.use(cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true
  }));
  
  // Metrics endpoint
  metricsApp.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });

  // Health check endpoint
  metricsApp.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Job dashboard (with basic auth)
  try {
    const { router } = createJobDashboard();
    metricsApp.use('/admin/queues', dashboardAuthMiddleware(), router);
    logger.info('Job dashboard available at /admin/queues');
  } catch (error) {
    logger.warn(error, 'Failed to setup job dashboard');
  }

  const metricsPort = Number(port) + 1;
  metricsApp.listen(metricsPort, () => {
    logger.info(`📊 Metrics available at http://localhost:${metricsPort}/metrics`);
    logger.info(`❤️ Health check available at http://localhost:${metricsPort}/health`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('SIGINT signal received: closing servers');
    await server.stop();
    logger.info('Apollo server stopped');
    
    try {
      await closePubSub();
      logger.info('Redis PubSub closed');
    } catch (error) {
      logger.error(error, 'Error closing Redis PubSub');
    }

    try {
      await stopJobWorkers();
      await closeJobQueues();
      logger.info('Job queues and workers closed');
    } catch (error) {
      logger.error(error, 'Error closing job queues');
    }
    
    process.exit(0);
  });
}

try {
  await bootstrap();
} catch (e) {
  logger.error({ err: e }, "Failed to start server");
  process.exit(1);
}
