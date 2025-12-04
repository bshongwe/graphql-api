import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'node:fs';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { resolvers } from './graphql/resolvers/index.js';
import { createContext } from './context.js';

// Load environment variables
import 'dotenv/config';

const typeDefs = readFileSync('./src/graphql/schema.graphql', 'utf8');

const server = new ApolloServer({
  schema: makeExecutableSchema({ typeDefs, resolvers }),
});

const { url } = await startStandaloneServer(server, {
  context: async ({ req }) => createContext({ req }),
  listen: { port: 4000 },
});

console.log(`Server ready at ${url}`);
