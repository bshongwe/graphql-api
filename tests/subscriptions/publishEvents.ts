import { UserEventPublisher, initializePubSub, closePubSub } from '../../src/infrastructure/pubsub.js';

/**
 * Test script to manually trigger subscription events
 * This demonstrates how the subscription system works by publishing events
 */

async function testUserSubscriptionEvents() {
  console.log('🚀 Testing GraphQL Subscription Events\n');

  try {
    // Initialize Redis PubSub connections
    console.log('🔌 Initializing Redis PubSub connections...');
    await initializePubSub();
    // Mock user data for testing
    const mockUser = {
      id: '123',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'USER',
      createdAt: new Date().toISOString(),
    };

    const updatedUser = {
      ...mockUser,
      name: 'John Smith',
      email: 'john.smith@example.com',
    };

    console.log('📨 Publishing UserCreated event...');
    await UserEventPublisher.publishUserCreated(mockUser);
    await delay(1000);

    console.log('📨 Publishing UserUpdated event...');
    await UserEventPublisher.publishUserUpdated(updatedUser, mockUser);
    await delay(1000);

    console.log('📨 Publishing UserOnline event...');
    await UserEventPublisher.publishUserOnline(mockUser, true);
    await delay(1000);

    console.log('📨 Publishing UserOnline (offline) event...');
    await UserEventPublisher.publishUserOnline(mockUser, false);
    await delay(1000);

    console.log('📨 Publishing UserDeleted event...');
    await UserEventPublisher.publishUserDeleted({
      id: mockUser.id,
      email: mockUser.email,
    });

    console.log('\n✅ All subscription events published successfully!');
    console.log('💡 If subscriptions are active, these events should be received by subscribers.\n');

    // Close Redis connections
    await closePubSub();
    console.log('🔌 Redis PubSub connections closed');

  } catch (error) {
    console.error('💥 Failed to publish subscription events:', error);
    
    try {
      await closePubSub();
    } catch (closeError) {
      console.error('💥 Failed to close Redis connections:', closeError);
    }
    
    process.exit(1);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await testUserSubscriptionEvents();
  process.exit(0);
}

export { testUserSubscriptionEvents };
