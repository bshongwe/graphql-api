import { userResolver } from './userResolver.js';

export const resolvers = {
  Query: {
    ...userResolver.Query,
  },
  Mutation: {
    ...userResolver.Mutation,
  },
};