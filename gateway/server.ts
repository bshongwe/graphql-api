import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';
import { ApolloGateway, IntrospectAndCompose } from '@apollo/gateway';

async function startGateway() {
  const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
      subgraphs: [
        {
          name: 'users',
          url: process.env.USER_SERVICE_URL || 'http://localhost:4000',
        },
        // Add other subgraphs here as they are created
        // {
        //   name: 'posts',
        //   url: process.env.POST_SERVICE_URL || 'http://localhost:4001',
        // },
      ],
    }),
  });

  const server = new ApolloServer({
    gateway,
    formatError: (err) => {
      console.error('Gateway error:', err);
      return {
        message: err.message,
        code: err.extensions?.code,
        path: err.path,
      };
    },
  });

  const { url } = await startStandaloneServer(server, {
    listen: { port: process.env.GATEWAY_PORT ? Number(process.env.GATEWAY_PORT) : 4100 },
  });

  console.log(`🚀 Gateway ready at ${url}`);
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down gateway...');
  process.exit(0);
});

try {
  await startGateway();
} catch (error) {
  console.error('Failed to start gateway:', error);
  process.exit(1);
}
