import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'node:fs';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { resolvers } from './graphql/resolvers/index.js';
import { createContext } from './context.js';

// Load environment variables
import 'dotenv/config';

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma adapter for PostgreSQL
const adapter = new PrismaPg(pool);

// Prisma v7 client initialization with PostgreSQL adapter
const prisma = new PrismaClient({
  adapter,
  log: ['error', 'warn'],
});

const typeDefs = readFileSync('./src/graphql/schema.graphql', 'utf8');

const server = new ApolloServer({
  schema: makeExecutableSchema({ typeDefs, resolvers }),
});

const { url } = await startStandaloneServer(server, {
  context: async () => createContext({ prisma }),
  listen: { port: 4000 },
});

console.log(`Server ready at ${url}`);
