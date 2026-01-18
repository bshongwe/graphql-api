import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  pubSub,
  SUBSCRIPTION_TOPICS,
  UserEventPublisher,
} from '../../src/infrastructure/pubsub.js';
import { logger } from '../../src/infrastructure/logger.js';

/**
 * Test suite for GraphQL subscriptions and PubSub system
 */
describe('GraphQL Subscriptions', () => {
  let mockUser: any;
  let receivedEvents: any[];

  beforeEach(() => {
    mockUser = {
      id: '123',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'USER',
      createdAt: new Date().toISOString(),
    };

    receivedEvents = [];
  });

  afterEach(() => {
    // Clean up any subscriptions
    receivedEvents = [];
  });

  describe('UserEventPublisher', () => {
    it('should publish user created events', async () => {
      // Mock pubSub.publish to capture events
      const originalPublish = pubSub.publish;
      pubSub.publish = jest.fn().mockImplementation((topic, payload) => {
        receivedEvents.push({ topic, payload });
        return Promise.resolve();
      });

      await UserEventPublisher.publishUserCreated(mockUser);

      expect(pubSub.publish).toHaveBeenCalledWith(
        SUBSCRIPTION_TOPICS.USER_CREATED,
        {
          userCreated: {
            user: mockUser,
            timestamp: expect.any(String),
          },
        }
      );

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].topic).toBe(SUBSCRIPTION_TOPICS.USER_CREATED);
      expect(receivedEvents[0].payload.userCreated.user).toEqual(mockUser);

      // Restore original method
      pubSub.publish = originalPublish;
    });

    it('should publish user updated events with previous values', async () => {
      const originalPublish = pubSub.publish;
      pubSub.publish = jest.fn().mockImplementation((topic, payload) => {
        receivedEvents.push({ topic, payload });
        return Promise.resolve();
      });

      const updatedUser = { ...mockUser, name: 'John Smith' };
      const previousValues = mockUser;

      await UserEventPublisher.publishUserUpdated(updatedUser, previousValues);

      expect(pubSub.publish).toHaveBeenCalledWith(
        SUBSCRIPTION_TOPICS.USER_UPDATED,
        {
          userUpdated: {
            user: updatedUser,
            previousValues,
            timestamp: expect.any(String),
          },
        }
      );

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].payload.userUpdated.user.name).toBe(
        'John Smith'
      );
      expect(receivedEvents[0].payload.userUpdated.previousValues.name).toBe(
        'John Doe'
      );

      pubSub.publish = originalPublish;
    });

    it('should publish user deleted events', async () => {
      const originalPublish = pubSub.publish;
      pubSub.publish = jest.fn().mockImplementation((topic, payload) => {
        receivedEvents.push({ topic, payload });
        return Promise.resolve();
      });

      await UserEventPublisher.publishUserDeleted({
        id: mockUser.id,
        email: mockUser.email,
      });

      expect(pubSub.publish).toHaveBeenCalledWith(
        SUBSCRIPTION_TOPICS.USER_DELETED,
        {
          userDeleted: {
            id: mockUser.id,
            email: mockUser.email,
            timestamp: expect.any(String),
          },
        }
      );

      expect(receivedEvents).toHaveLength(1);

      pubSub.publish = originalPublish;
    });

    it('should publish user online status events', async () => {
      const originalPublish = pubSub.publish;
      pubSub.publish = jest.fn().mockImplementation((topic, payload) => {
        receivedEvents.push({ topic, payload });
        return Promise.resolve();
      });

      await UserEventPublisher.publishUserOnline(mockUser, true);

      expect(pubSub.publish).toHaveBeenCalledWith(
        SUBSCRIPTION_TOPICS.USER_ONLINE,
        {
          userOnline: {
            user: mockUser,
            isOnline: true,
            timestamp: expect.any(String),
          },
        }
      );

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].payload.userOnline.isOnline).toBe(true);

      pubSub.publish = originalPublish;
    });

    it('should handle publishing errors gracefully', async () => {
      const originalPublish = pubSub.publish;
      const mockError = new Error('Redis connection failed');

      pubSub.publish = jest.fn().mockRejectedValue(mockError);

      // Mock logger to capture error logs
      const originalLoggerError = logger.error;
      const loggerErrors: any[] = [];
      logger.error = jest.fn().mockImplementation((...args) => {
        loggerErrors.push(args);
      });

      // Should not throw error, but should log it
      await expect(
        UserEventPublisher.publishUserCreated(mockUser)
      ).resolves.toBeUndefined();

      expect(loggerErrors).toHaveLength(1);
      expect(loggerErrors[0][0]).toBe(mockError);

      // Restore mocks
      pubSub.publish = originalPublish;
      logger.error = originalLoggerError;
    });
  });

  describe('Subscription Topics', () => {
    it('should have correct topic constants', () => {
      expect(SUBSCRIPTION_TOPICS.USER_CREATED).toBe('USER_CREATED');
      expect(SUBSCRIPTION_TOPICS.USER_UPDATED).toBe('USER_UPDATED');
      expect(SUBSCRIPTION_TOPICS.USER_DELETED).toBe('USER_DELETED');
      expect(SUBSCRIPTION_TOPICS.USER_ONLINE).toBe('USER_ONLINE');
    });
  });

  describe('Event Payload Structure', () => {
    it('should include timestamp in all events', async () => {
      const originalPublish = pubSub.publish;
      pubSub.publish = jest.fn().mockImplementation((topic, payload) => {
        receivedEvents.push({ topic, payload });
        return Promise.resolve();
      });

      await UserEventPublisher.publishUserCreated(mockUser);
      await UserEventPublisher.publishUserUpdated(mockUser, null);
      await UserEventPublisher.publishUserDeleted({
        id: '1',
        email: 'test@test.com',
      });
      await UserEventPublisher.publishUserOnline(mockUser, true);

      expect(receivedEvents).toHaveLength(4);

      for (const event of receivedEvents) {
        const payloadKey = Object.keys(event.payload)[0];
        const payload = event.payload[payloadKey];

        expect(payload).toHaveProperty('timestamp');
        expect(typeof payload.timestamp).toBe('string');
        expect(new Date(payload.timestamp)).toBeInstanceOf(Date);
      }

      pubSub.publish = originalPublish;
    });
  });
});
