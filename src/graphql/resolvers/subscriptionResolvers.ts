import { withFilter } from 'graphql-subscriptions';
import { pubSub, SUBSCRIPTION_TOPICS } from '../../infrastructure/pubsub.js';
import { logger } from '../../infrastructure/logger.js';

/**
 * Subscription resolvers for real-time GraphQL subscriptions
 */
export const subscriptionResolvers = {
  Subscription: {
    /**
     * Subscribe to user creation events
     */
    userCreated: {
      subscribe: () => {
        logger.info('New subscription to userCreated');
        return pubSub.asyncIterator([SUBSCRIPTION_TOPICS.USER_CREATED]);
      },
    },

    /**
     * Subscribe to user update events
     * Can be filtered by user ID if needed
     */
    userUpdated: {
      subscribe: withFilter(
        () => {
          logger.info('New subscription to userUpdated');
          return pubSub.asyncIterator([SUBSCRIPTION_TOPICS.USER_UPDATED]);
        },
        (payload, variables, context) => {
          // Optional: Filter by user ID if provided
          if (variables.userId) {
            return payload.userUpdated.user.id === variables.userId;
          }
          return true;
        }
      ),
    },

    /**
     * Subscribe to user deletion events
     */
    userDeleted: {
      subscribe: () => {
        logger.info('New subscription to userDeleted');
        return pubSub.asyncIterator([SUBSCRIPTION_TOPICS.USER_DELETED]);
      },
    },

    /**
     * Subscribe to user online status changes
     * Can be filtered by user ID if needed
     */
    userOnline: {
      subscribe: withFilter(
        () => {
          logger.info('New subscription to userOnline');
          return pubSub.asyncIterator([SUBSCRIPTION_TOPICS.USER_ONLINE]);
        },
        (payload, variables, context) => {
          // Optional: Filter by user ID if provided
          if (variables.userId) {
            return payload.userOnline.user.id === variables.userId;
          }
          return true;
        }
      ),
    },
  },
};

/**
 * WebSocket connection lifecycle handlers
 */
export const subscriptionHandlers = {
  /**
   * Handle new WebSocket connections
   */
  onConnect: async (connectionParams: any, webSocket: any, context: any) => {
    logger.info({ connectionParams }, 'WebSocket connection established');
    
    // Optional: Extract auth token from connection params
    const token = connectionParams?.Authorization || connectionParams?.authorization;
    
    if (token) {
      try {
        // Validate JWT token - for now accept all tokens
        // In production, implement proper JWT validation
        logger.info('WebSocket connection authenticated');
        return { isAuthenticated: true, token };
      } catch (error) {
        logger.error(error, 'WebSocket authentication failed');
        throw new Error('Authentication failed');
      }
    }
    
    return { isAuthenticated: false };
  },

  /**
   * Handle WebSocket disconnections
   */
  onDisconnect: async (webSocket: any, context: any) => {
    logger.info('WebSocket connection disconnected');
  },

  /**
   * Handle subscription start
   */
  onOperationStart: async (message: any, params: any, webSocket: any) => {
    logger.info({ 
      operationName: params.operationName,
      query: params.query.replaceAll(/\s+/g, ' ').trim()
    }, 'Subscription operation started');
    
    return params;
  },

  /**
   * Handle subscription stop
   */
  onOperationComplete: async (webSocket: any, opId: string) => {
    logger.info({ operationId: opId }, 'Subscription operation completed');
  },
};
