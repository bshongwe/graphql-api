import { RedisPubSub } from 'graphql-redis-subscriptions';
import { createClient } from 'redis';
import { logger } from './logger.js';

/**
 * Redis client configuration
 */
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  db: Number.parseInt(process.env.REDIS_DB || '0', 10),
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

/**
 * Create Redis clients for PubSub
 */
const publisher = createClient(redisConfig);
const subscriber = createClient(redisConfig);

/**
 * Redis PubSub instance for GraphQL subscriptions
 */
export const pubSub = new RedisPubSub({
  publisher: publisher as any,
  subscriber: subscriber as any,
  messageEventName: 'message',
  pmessageEventName: 'pmessage',
});

/**
 * Initialize Redis connections
 */
export async function initializePubSub(): Promise<void> {
  try {
    await publisher.connect();
    await subscriber.connect();
    
    logger.info({
      host: redisConfig.host,
      port: redisConfig.port,
      db: redisConfig.db,
    }, 'Redis PubSub initialized successfully');

    // Handle Redis connection events
    publisher.on('error', (err: Error) => {
      logger.error(err, 'Redis Publisher error');
    });

    subscriber.on('error', (err: Error) => {
      logger.error(err, 'Redis Subscriber error');
    });

    publisher.on('connect', () => {
      logger.info('Redis Publisher connected');
    });

    subscriber.on('connect', () => {
      logger.info('Redis Subscriber connected');
    });

  } catch (error) {
    logger.error(error, 'Failed to initialize Redis PubSub');
    throw error;
  }
}

/**
 * Close Redis connections
 */
export async function closePubSub(): Promise<void> {
  try {
    await pubSub.close();
    await publisher.quit();
    await subscriber.quit();
    logger.info('Redis PubSub connections closed');
  } catch (error) {
    logger.error(error, 'Error closing Redis PubSub connections');
    throw error;
  }
}

/**
 * Subscription topics/channels
 */
export const SUBSCRIPTION_TOPICS = {
  USER_CREATED: 'USER_CREATED',
  USER_UPDATED: 'USER_UPDATED',
  USER_DELETED: 'USER_DELETED',
  USER_ONLINE: 'USER_ONLINE',
} as const;

/**
 * Publish user events to subscribers
 */
export class UserEventPublisher {
  static async publishUserCreated(user: any): Promise<void> {
    try {
      await pubSub.publish(SUBSCRIPTION_TOPICS.USER_CREATED, {
        userCreated: {
          user,
          timestamp: new Date().toISOString(),
        },
      });
      logger.info({ userId: user.id }, 'Published USER_CREATED event');
    } catch (error) {
      logger.error(error, 'Failed to publish USER_CREATED event');
    }
  }

  static async publishUserUpdated(user: any, previousValues?: any): Promise<void> {
    try {
      await pubSub.publish(SUBSCRIPTION_TOPICS.USER_UPDATED, {
        userUpdated: {
          user,
          previousValues,
          timestamp: new Date().toISOString(),
        },
      });
      logger.info({ userId: user.id }, 'Published USER_UPDATED event');
    } catch (error) {
      logger.error(error, 'Failed to publish USER_UPDATED event');
    }
  }

  static async publishUserDeleted(user: { id: string; email: string }): Promise<void> {
    try {
      await pubSub.publish(SUBSCRIPTION_TOPICS.USER_DELETED, {
        userDeleted: {
          id: user.id,
          email: user.email,
          timestamp: new Date().toISOString(),
        },
      });
      logger.info({ userId: user.id }, 'Published USER_DELETED event');
    } catch (error) {
      logger.error(error, 'Failed to publish USER_DELETED event');
    }
  }

  static async publishUserOnline(user: any, isOnline: boolean): Promise<void> {
    try {
      await pubSub.publish(SUBSCRIPTION_TOPICS.USER_ONLINE, {
        userOnline: {
          user,
          isOnline,
          timestamp: new Date().toISOString(),
        },
      });
      logger.info({ userId: user.id, isOnline }, 'Published USER_ONLINE event');
    } catch (error) {
      logger.error(error, 'Failed to publish USER_ONLINE event');
    }
  }
}
