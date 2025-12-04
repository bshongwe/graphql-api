import "reflect-metadata";
import express from "express";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { readFileSync } from "node:fs";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { collectDefaultMetrics, register } from "prom-client";
import { logger } from "./infrastructure/logger.js";
import { createContext } from "./context.js";
import { resolvers } from "./graphql/resolvers/index.js";

// Load environment variables
import "dotenv/config";

async function bootstrap() {
  // Initialize metrics collection
  collectDefaultMetrics();

  // Create PostgreSQL connection pool
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Create Prisma adapter for PostgreSQL
  const adapter = new PrismaPg(pool);

  // Initialize Prisma client
  const prisma = new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });

  // Load GraphQL schema
  const typeDefs = readFileSync('./src/graphql/schema.graphql', 'utf8');

  // Create Apollo Server
  const server = new ApolloServer({
    schema: makeExecutableSchema({ typeDefs, resolvers }),
    formatError: (err) => {
      // Central error mapping; keep messages safe for clients
      logger.error({ err }, "GraphQL error");
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
    context: async () => createContext({ prisma }),
    listen: { port: Number(port) },
  });

  logger.info(`🚀 Server ready at ${url}`);

  // Setup separate Express app for metrics and health endpoints
  const metricsApp = express();
  
  // Metrics endpoint
  metricsApp.get("/metrics", async (_req, res) => {
    res.set("Content-Type", register.contentType);
    res.end(await register.metrics());
  });

  // Health check endpoint
  metricsApp.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

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
    process.exit(0);
  });
}

try {
  await bootstrap();
} catch (e) {
  logger.error({ err: e }, "Failed to start server");
  process.exit(1);
}
