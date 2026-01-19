import request from 'supertest';
import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { readFileSync } from 'node:fs';
import { resolvers } from '../../src/graphql/resolvers/index.js';
import { createContext } from '../../src/context.js';

export class GraphQLTestClient {
  private server?: ApolloServer;
  private url?: string;

  constructor() {
    this.setupServer();
  }

  private async setupServer() {
    const typeDefs = readFileSync('./src/graphql/schema.graphql', 'utf8');

    this.server = new ApolloServer({
      schema: makeExecutableSchema({ typeDefs, resolvers }),
      formatError: (err: any) => ({
        message: err.message,
        code: err.extensions?.code,
        path: err.path,
      }),
    });

    const { url } = await startStandaloneServer(this.server, {
      context: async ({ req }) => createContext({ req }),
      listen: { port: 0 }, // Use random available port
    });

    this.url = url;
  }

  /**
   * Execute GraphQL query
   */
  async query(
    query: string,
    variables?: Record<string, any>,
    headers?: Record<string, string>
  ) {
    await this.setupServer(); // Ensure server is ready

    const response = await request(this.url!)
      .post('/')
      .set(headers || {})
      .send({ query, variables });

    return response.body;
  }

  /**
   * Execute GraphQL mutation
   */
  async mutate(
    mutation: string,
    variables?: Record<string, any>,
    headers?: Record<string, string>
  ) {
    return this.query(mutation, variables, headers);
  }

  /**
   * Execute authenticated query
   */
  async authenticatedQuery(
    query: string,
    token: string,
    variables?: Record<string, any>
  ) {
    return this.query(query, variables, { Authorization: `Bearer ${token}` });
  }

  /**
   * Execute authenticated mutation
   */
  async authenticatedMutation(
    mutation: string,
    token: string,
    variables?: Record<string, any>
  ) {
    return this.mutate(mutation, variables, {
      Authorization: `Bearer ${token}`,
    });
  }

  /**
   * Clean up server
   */
  async cleanup() {
    if (this.server) {
      await this.server.stop();
    }
  }
}

// Common GraphQL queries and mutations for testing
export const testQueries = {
  ME: `
    query Me {
      me {
        id
        name
        email
        role
      }
    }
  `,

  USERS: `
    query Users {
      users {
        id
        name
        email
        role
      }
    }
  `,
};

export const testMutations = {
  SIGN_UP: `
    mutation SignUp($name: String!, $email: String!, $password: String!) {
      signUp(name: $name, email: $email, password: $password) {
        token
        user {
          id
          name
          email
          role
        }
      }
    }
  `,

  SIGN_IN: `
    mutation SignIn($email: String!, $password: String!) {
      signIn(email: $email, password: $password) {
        token
        user {
          id
          name
          email
          role
        }
      }
    }
  `,
};

// Test helper functions
export const testHelpers = {
  /**
   * Assert GraphQL error
   */
  assertGraphQLError(response: any, expectedCode?: string) {
    expect(response.errors).toBeDefined();
    expect(response.errors).toHaveLength(1);
    if (expectedCode) {
      expect(response.errors[0].code).toBe(expectedCode);
    }
  },

  /**
   * Assert successful response
   */
  assertSuccessResponse(response: any) {
    expect(response.errors).toBeUndefined();
    expect(response.data).toBeDefined();
  },

  /**
   * Extract data from GraphQL response
   */
  extractData<T>(response: any, field: string): T {
    this.assertSuccessResponse(response);
    return response.data[field];
  },
};
