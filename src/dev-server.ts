import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { readFileSync } from 'node:fs';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

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

const resolvers = {
  Query: {
    hello: () => 'Hello from GraphQL Enterprise Demo!',
    users: async (_parent: any, _args: any, context: any) => {
      return context.prisma.user.findMany({
        include: { posts: true }
      });
    },
    posts: async (_parent: any, _args: any, context: any) => {
      return context.prisma.post.findMany({
        include: { author: true }
      });
    },
    user: async (_parent: any, args: any, context: any) => {
      return context.prisma.user.findUnique({
        where: { id: args.id },
        include: { posts: true }
      });
    },
    post: async (_parent: any, args: any, context: any) => {
      return context.prisma.post.findUnique({
        where: { id: args.id },
        include: { author: true }
      });
    },
  },
  Mutation: {
    createUser: async (_parent: any, args: any, context: any) => {
      return context.prisma.user.create({
        data: {
          name: args.name,
          email: args.email,
          password: args.password,
          role: args.role || 'USER',
        },
        include: { posts: true }
      });
    },
    createPost: async (_parent: any, args: any, context: any) => {
      return context.prisma.post.create({
        data: {
          title: args.title,
          content: args.content,
          authorId: args.authorId,
        },
        include: { author: true }
      });
    },
  },
};

const server = new ApolloServer({
  schema: makeExecutableSchema({ typeDefs, resolvers }),
});

const { url } = await startStandaloneServer(server, {
  context: async () => ({ prisma }),
  listen: { port: 4000 },
});

console.log(`Server ready at ${url}`);
