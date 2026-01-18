import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'node:fs';
import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse } from 'graphql';
import { resolvers } from './graphql/resolvers/index.js';
import { createContext } from './context.js';
import { AppError } from './utils/errorHandler.js';

// Load environment variables
import 'dotenv/config';

const typeDefs = readFileSync('./src/graphql/schema.graphql', 'utf8');

const server = new ApolloServer({
  schema: buildSubgraphSchema([{ typeDefs: parse(typeDefs), resolvers }]),
  formatError: (err: any) => {
    console.error('GraphQL error:', err);

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

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => createContext({ req }),
  listen: { port: 4000 },
});

console.log(`Server ready at ${url}`);
