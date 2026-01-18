import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { ApolloClient, InMemoryCache, gql } from '@apollo/client';
import WebSocket from 'ws';

/**
 * GraphQL subscription test client
 * This demonstrates how to test GraphQL subscriptions
 */

// Create WebSocket client for subscriptions
const wsClient = createClient({
  url: 'ws://localhost:4000/graphql',
  webSocketImpl: WebSocket,
  connectionParams: {
    // Optional: Add authentication headers
    // Authorization: 'Bearer your-jwt-token-here'
  },
});

// Create GraphQL WS Link
const wsLink = new GraphQLWsLink(wsClient);

// Create Apollo Client for subscriptions
const client = new ApolloClient({
  link: wsLink,
  cache: new InMemoryCache(),
});

// Subscription queries
const USER_CREATED_SUBSCRIPTION = gql`
  subscription UserCreated {
    userCreated {
      user {
        id
        name
        email
        role
      }
      timestamp
    }
  }
`;

const USER_UPDATED_SUBSCRIPTION = gql`
  subscription UserUpdated($userId: ID) {
    userUpdated(userId: $userId) {
      user {
        id
        name
        email
        role
      }
      previousValues {
        id
        name
        email
        role
      }
      timestamp
    }
  }
`;

const USER_DELETED_SUBSCRIPTION = gql`
  subscription UserDeleted {
    userDeleted {
      id
      email
      timestamp
    }
  }
`;

/**
 * Test subscription functions
 */
async function testUserCreatedSubscription() {
  console.log('🔄 Starting UserCreated subscription test...');

  const subscription = client.subscribe({
    query: USER_CREATED_SUBSCRIPTION,
  });

  const subscriptionObserver = subscription.subscribe({
    next: result => {
      console.log('📨 UserCreated event received:', result);
    },
    error: err => {
      console.error('❌ UserCreated subscription error:', err);
    },
    complete: () => {
      console.log('✅ UserCreated subscription completed');
    },
  });

  return subscriptionObserver;
}

async function testUserUpdatedSubscription(userId?: string) {
  console.log('🔄 Starting UserUpdated subscription test...');

  const subscription = client.subscribe({
    query: USER_UPDATED_SUBSCRIPTION,
    variables: { userId },
  });

  const subscriptionObserver = subscription.subscribe({
    next: result => {
      console.log('📨 UserUpdated event received:', result);
    },
    error: err => {
      console.error('❌ UserUpdated subscription error:', err);
    },
    complete: () => {
      console.log('✅ UserUpdated subscription completed');
    },
  });

  return subscriptionObserver;
}

async function testUserDeletedSubscription() {
  console.log('🔄 Starting UserDeleted subscription test...');

  const subscription = client.subscribe({
    query: USER_DELETED_SUBSCRIPTION,
  });

  const subscriptionObserver = subscription.subscribe({
    next: result => {
      console.log('📨 UserDeleted event received:', result);
    },
    error: err => {
      console.error('❌ UserDeleted subscription error:', err);
    },
    complete: () => {
      console.log('✅ UserDeleted subscription completed');
    },
  });

  return subscriptionObserver;
}

/**
 * Run subscription tests
 */
async function runSubscriptionTests() {
  console.log('🚀 Starting GraphQL Subscription Tests\n');

  try {
    // Start all subscriptions
    const userCreatedSub = await testUserCreatedSubscription();
    const userUpdatedSub = await testUserUpdatedSubscription();
    const userDeletedSub = await testUserDeletedSubscription();

    console.log('\n✅ All subscriptions started successfully!');
    console.log(
      '💡 Now perform mutations in another terminal to see ' +
        'subscription events:\n'
    );

    console.log('Example mutations:');
    console.log('1. Sign up a new user to trigger userCreated');
    console.log('2. Update user profile to trigger userUpdated');
    console.log('3. Delete a user (admin only) to trigger userDeleted\n');

    // Keep the process running to listen for events
    console.log(
      '⏳ Listening for subscription events... (Press Ctrl+C to stop)'
    );

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down subscriptions...');
      userCreatedSub.unsubscribe();
      userUpdatedSub.unsubscribe();
      userDeletedSub.unsubscribe();
      wsClient.dispose();
      process.exit(0);
    });
  } catch (error) {
    console.error('💥 Subscription test failed:', error);
    wsClient.dispose();
    process.exit(1);
  }
}

// Run the tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await runSubscriptionTests();
}

export {
  testUserCreatedSubscription,
  testUserUpdatedSubscription,
  testUserDeletedSubscription,
  runSubscriptionTests,
};
