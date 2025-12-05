import { userResolver } from './userResolver.js';
import { subscriptionResolvers } from './subscriptionResolvers.js';

export const resolvers = {
  Query: {
    ...userResolver.Query,
  },
  Mutation: {
    ...userResolver.Mutation,
  },
  Subscription: {
    ...subscriptionResolvers.Subscription,
  },
  User: {
    ...userResolver.User,
  },
};